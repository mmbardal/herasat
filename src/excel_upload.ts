import { DB } from "./db";
import ExcelJS from "exceljs";
import * as fs from "fs";
import * as fsExtra from "fs-extra";
import * as path from "path";
import { fileURLToPath } from 'url';
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { MySQLRowDataPacket } from "@fastify/mysql";
import { excelPluginDownloadProvince, excelPluginDownloadVahed } from "./excel_download";
import type { excelRequests, multipartParts } from "./schema/panel";
import { checkExcelReadAccess, validateToken } from "./check";
import type { User } from "./apis/v1/login";
import { logError } from "./logger";
//import fastify from 'fastify';
//import multipart, { fastifyMultipart } from '@fastify/multipart';

async function getColumnCount(tableName: string): Promise<number> {
  const columnQuery = `
    SELECT COUNT(*) AS column_count
    FROM information_schema.columns
    WHERE table_schema = ?
    AND table_name = ?;
  `;

  const databaseName = 'herasat';
  const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(columnQuery, [databaseName, tableName]);

  if (rows.length > 0) {
    return rows[0].column_count as number;
  } else {
    throw new Error(`Table ${tableName} not found in database ${databaseName}.`);
  }
}

async function uploadExcelToDatabase(filePath: string, tableID: string, reply: FastifyReply, vahed: string, province: string):Promise<void> {
  try {
    const vahedName = vahed;
    const provinceName = province;

    const columnNumber = await getColumnCount(`table_${tableID}`);

    const checkQuery = `SELECT COUNT(*) as count FROM table_${tableID} WHERE col_${columnNumber-1} <> 0`;
    const [checkResult] = await DB.conn.execute<MySQLRowDataPacket[]>(checkQuery);

    if (checkResult[0].count > 0) {
      await reply.status(404).send({ success: false, message: "You have entered data for this form before, please await approval by province" });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    const rows: string[][] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData = (row.values as (string | number | boolean)[]).slice(1).map((value) => value.toString());
      rows.push(rowData);
    });

    if (rows.length === 0) {
      throw new Error("No data to insert");
    }

    const additionalValues = [vahedName, provinceName, '1'];
    const columns = rows[0].map((_, index) => `col_${index}`).join(", ") + `, col_${rows[0].length}, col_${rows[0].length + 1}, col_${rows[0].length + 2}`;

    const maxStatementSize = 1024 * 1024;
    const insertQuery = `INSERT INTO table_${tableID} (${columns}) VALUES `;
    let currentSize = insertQuery.length;
    const queries: string[] = [];
    const queryParams: unknown[] = [];
    let valuesPart = "";

    rows.forEach((row, rowIndex) => {
      const fullRow = row.concat(additionalValues);

      const rowPlaceholder = `(${fullRow.map(() => "?").join(", ")})`;
      valuesPart += rowPlaceholder + ", ";
      fullRow.forEach((value) => queryParams.push(value));

      currentSize += rowPlaceholder.length;

      if (currentSize > maxStatementSize || rowIndex === rows.length - 1) {
        valuesPart = valuesPart.slice(0, -2);
        queries.push(insertQuery + valuesPart);
        valuesPart = "";
        currentSize = insertQuery.length;
      }
    });

    const connection = await DB.conn.getConnection();
    await connection.beginTransaction();
    try {
      const deleteQuery = `DELETE FROM table_${tableID} WHERE (col_${columnNumber-1} = 1 OR col_${columnNumber-1} = 0) AND col_${columnNumber-3} = ?`;
      console.log(vahedName);
      await connection.execute(deleteQuery, [vahedName]);

      for (const query of queries) {
        await connection.execute(query, queryParams.splice(0, (query.match(/\?/g) ?? []).length));
      }
      await connection.commit();
      console.log("Data inserted successfully!");
    } catch (error) {
      await connection.rollback();
      console.error("Error during insertion, transaction rolled back:", error);
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error uploading and inserting data:", error);
    throw error;
  } finally {
    await fsExtra.remove(filePath);
  }
}

async function provinceApprove(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  let jbody: excelRequests;
  try {
    jbody = request.body as excelRequests;
  } catch (e: unknown) {
    await reply.code(400).send({ message: "bad request" });
    throw new Error();
  }

  const token = jbody.token;
  const tableID: string = jbody.tableID;
  const approval = jbody.approval;
  const vahedName = jbody.vahedName;

  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    const user_val = JSON.parse(user) as User;
    if (!await checkExcelReadAccess(user_val.id, Number(tableID), "read")) {
      await reply.code(403).send({ message: "forbidden" });
      return;
    }
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }

  const columnNumber = await getColumnCount(`table_${tableID}`);
  let updateQuery = ``;

  if (approval == "approve")
  {
    updateQuery = `
    UPDATE table_${tableID}
    SET col_${columnNumber-1} = 2
    WHERE col_${columnNumber-3} = "${vahedName}" AND col_${columnNumber-1} = 1;
  `;
  }
  else if (approval == "disapprove")
  {
    updateQuery = `
    UPDATE table_${tableID}
    SET col_${columnNumber-1} = 0
    WHERE col_${columnNumber-3} = "${vahedName}" AND col_${columnNumber-1} = 1;
  `;
  }

  try {
    const [result] = await DB.conn.execute(updateQuery);
    //console.log('Update successful:', result);
    await reply.send({ success: true, message: 'Update successful', result });
  } catch (error) {
    //console.error('Error approving table:', error);
    await reply.status(500).send({ success: false, message: 'Error approving table', error });
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function excelPluginUpload(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  
  let token = "";
  let tableID = "";
  let vahedName = "";
  let provinceName = "";
  let data : unknown  = null;
  let filename = "";

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const parts : multipartParts[] = request.parts() as unknown as multipartParts[]
  for await (const part of parts) {
    const section = part as unknown as multipartParts
    if (section.type === 'file') {
      data = section.file;
      filename = section.filename;
      
    } else {
      if (section.fieldname == "token")
      {
        token = section.value;
      }
      if (section.fieldname == "tableID")
      {
        tableID = section.value;
      }
      if (section.fieldname == "vahedName")
      {
        vahedName = section.value;
      }
      if (section.fieldname == "provinceName")
      {
        provinceName = section.value;
      }
    }
  }
  if (data == null) {
    await reply.status(400).send({ success: false, message: "No file uploaded" });
    return;
  }
  
  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    console.log(user)
    const user_val = JSON.parse(user) as User;
    if (!await checkExcelReadAccess(user_val.id, Number(tableID), "read")) {
      await reply.code(403).send({ message: "forbidden" });
      return;
    }
    //vahedName = user_val.branch;
    //provinceName = user_val.province;
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }

  const uploadDir = path.join(__dirname, "uploads");
  await fsExtra.ensureDir(uploadDir);
  const filePath = path.join(uploadDir, filename);

  const fileWriteStream = fs.createWriteStream(filePath);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataFinal: any = data
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
  dataFinal.pipe(fileWriteStream);

  await new Promise<void>((resolve, reject) => {
    fileWriteStream.on("finish", resolve);
    fileWriteStream.on("error", reject);
  });

  try {
    console.log(vahedName)
    await uploadExcelToDatabase(filePath, tableID, reply, vahedName, provinceName);
    await reply.send({ success: true, message: "Data uploaded and inserted successfully" });
  } catch (error) {
    await reply.status(500).send({ success: false, message: "Error uploading and inserting data", error });
  } finally {
    if (await fsExtra.pathExists(filePath)) {
      await fsExtra.remove(filePath);
    }
  }
}

export function ExcelFileAPI(fastifier: FastifyInstance, prefix?: string): void {
  fastifier.post(`${prefix ?? ""}/upload-excel`, excelPluginUpload);
  fastifier.post(`${prefix ?? ""}/export-excel-branch`, excelPluginDownloadVahed);
  fastifier.post(`${prefix ?? ""}/export-excel-province`, excelPluginDownloadProvince);
  fastifier.post(`${prefix ?? ""}/approveVahedTable`, provinceApprove);
}
