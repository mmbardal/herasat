import { DB } from "./db";
import ExcelJS from "exceljs";
import * as fs from "fs";
import * as fsExtra from "fs-extra";
import * as path from "path";
import { fileURLToPath } from 'url';
import type { FastifyRequest, FastifyReply } from "fastify";
import type { MySQLRowDataPacket } from "@fastify/mysql";
import { excelPluginDownloadProvince, excelPluginDownloadVahed } from "./excel_download";
import { fileRequests } from "./schema/panel";
import { checkExcelReadAccess, validateToken } from "./check";
import { User } from "./apis/v1/login";
import { logError } from "./logger";
import * as fastify from "fastify";
import fastifyy from 'fastify';
import fastifyMultipart from 'fastify-multipart';

const app = fastifyy();

app.register(fastifyMultipart);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    return rows[0].column_count;
  } else {
    throw new Error(`Table ${tableName} not found in database ${databaseName}.`);
  }
}

async function uploadExcelToDatabase(filePath: string, tableID: string, reply: FastifyReply, vahed: string, province: string) {
  try {
    const vahedName = vahed;
    const provinceName = province;

    const columnNumber = await getColumnCount(`table_${tableID}`);

    const checkQuery = `SELECT COUNT(*) as count FROM table_${tableID} WHERE col_${columnNumber-1} <> 2 AND col_${columnNumber-1} <> 3 AND col_${columnNumber-1} <> 4 AND col_${columnNumber-1} <> 5 AND col_${columnNumber-1} <> 6`;
    const [checkResult] = await DB.conn.execute<MySQLRowDataPacket[]>(checkQuery);

    if (checkResult[0].count === 0) {
      reply.status(404).send({ success: false, message: "No rows found with approve = 1" });
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
    let insertQuery = `INSERT INTO table_${tableID} (${columns}) VALUES `;
    let currentSize = insertQuery.length;
    const queries: string[] = [];
    const queryParams: any[] = [];
    let valuesPart = "";

    rows.forEach((row, rowIndex) => {
      const fullRow = row.concat(additionalValues);
      const cleanedRow = fullRow.map(value => DB.conn.escape(value));

      const rowPlaceholder = `(${cleanedRow.map(() => "?").join(", ")})`;
      valuesPart += rowPlaceholder + ", ";
      cleanedRow.forEach((value) => queryParams.push(value));

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
      const deleteQuery = `DELETE FROM table_${tableID} WHERE col_${columnNumber-1} = 1 AND col_${columnNumber-3} = ${vahedName}`;
      await connection.execute(deleteQuery);

      for (const query of queries) {
        await connection.execute(query, queryParams.splice(0, (query.match(/\?/g) || []).length));
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

async function excelPluginUpload(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  let jbody: fileRequests;
  try {
    jbody = request.body as fileRequests;
  } catch (e: unknown) {
    await reply.code(400).send({ message: "bad request" });
    throw new Error();
  }

  const token = jbody.token;
  const tableID: string = jbody.tableID;
  let vahedName = jbody.vahedName;
  let provinceName = jbody.provinceName;

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
    vahedName = user_val.branch;
    provinceName = user_val.province;
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }

  const data = await request.file();
  if (!data) {
    reply.status(400).send({ success: false, message: "No file uploaded" });
    return;
  }

  const uploadDir = path.join(__dirname, "uploads");
  await fsExtra.ensureDir(uploadDir);
  const filePath = path.join(uploadDir, data.filename);

  const fileWriteStream = fs.createWriteStream(filePath);
  data.file.pipe(fileWriteStream);

  await new Promise<void>((resolve, reject) => {
    fileWriteStream.on("finish", resolve);
    fileWriteStream.on("error", reject);
  });

  try {
    await uploadExcelToDatabase(filePath, tableID, reply, vahedName, provinceName);
    reply.send({ success: true, message: "Data uploaded and inserted successfully" });
  } catch (error) {
    reply.status(500).send({ success: false, message: "Error uploading and inserting data", error });
  } finally {
    if (await fsExtra.pathExists(filePath)) {
      await fsExtra.remove(filePath);
    }
  }
}

async function provinceApprove(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  let jbody: fileRequests;
  try {
    jbody = request.body as fileRequests;
  } catch (e: unknown) {
    await reply.code(400).send({ message: "bad request" });
    throw new Error();
  }

  const token = jbody.token;
  const tableID: string = jbody.tableID;
  const approval = jbody.approval;
  let vahedName = jbody.vahedName;
  let provinceName = jbody.provinceName;

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
    provinceName = user_val.province;
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
    WHERE col_${columnNumber-3} = ${vahedName} AND col_${columnNumber-1} < 3 AND col_${columnNumber-1} <> 0;
  `;
  }
  else if (approval == "disapprove")
  {
    updateQuery = `
    UPDATE table_${tableID}
    SET col_${columnNumber-1} = 0
    WHERE col_${columnNumber-3} = ${vahedName} AND col_${columnNumber-1} < 3 AND col_${columnNumber-1} <> 0;
  `;
  }

  try {
    const [result] = await DB.conn.execute(updateQuery);
    console.log('Update successful:', result);
    reply.send({ success: true, message: 'Update successful', result });
  } catch (error) {
    console.error('Error approving table:', error);
    reply.status(500).send({ success: false, message: 'Error approving table', error });
  }
  
}

export function ExcelFileAPI(fastifier: fastify.FastifyInstance, prefix?: string): void {
  fastifier.post(`${prefix ?? ""}/upload-excel`, excelPluginUpload);
  fastifier.post(`${prefix ?? ""}/export-excel-branch`, excelPluginDownloadVahed);
  fastifier.post(`${prefix ?? ""}/export-excel-province`, excelPluginDownloadProvince);
  fastifier.post(`${prefix ?? ""}/approveVahedTable`, provinceApprove);
}
