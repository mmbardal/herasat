import { DB } from "./db";
import ExcelJS from "exceljs";
import * as fs from "fs";
import * as fsExtra from "fs-extra";
import * as path from "path";
import { fastify } from "fastify";
import { fileURLToPath } from 'url';
import type { MySQLRowDataPacket } from "@fastify/mysql";
import { excelPluginDownloadProvince, excelPluginDownloadVahed } from "./excel_download";


// Equivalent to `__dirname` in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to upload and insert data from Excel to MySQL
async function uploadExcelToDatabase(filePath: string, tableID: string, reply: fastify.FastifyReply) {
  try {
    const vahedName = "vahed";      //todo: fix vahedName
    const provinceName = "ostan";      //todo: fix provinceName

    // Check if there are any rows where the approve column is 1
    const checkQuery = `SELECT COUNT(*) as count FROM tableName WHERE approve <> 2 AND approve <> 3 AND approve <> 4 AND approve <> 5 AND approve <> 6`; // Replace 'tableName' with the actual table name
    const [checkResult] = await DB.conn.execute<MySQLRowDataPacket[]>(checkQuery);
    
    // If no rows are found, send a 404 forbidden reply and rollback the transaction
    if (checkResult[0].count === 0) {
      reply.status(404).send({ success: false, message: "No rows found with approve = 1" });
      return;
    }

    // Load the workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // Get the first worksheet
    const worksheet = workbook.worksheets[0];

    // Prepare the data for insertion
    const rows: string[][] = [];
    worksheet.eachRow((row, rowNumber) => {
      // Skip the first row (header)
      if (rowNumber === 1) return;

      const rowData = (row.values as (string | number | boolean)[]).slice(1).map((value) => value.toString()); // Remove the empty first element and convert to string
      rows.push(rowData);
    });

    if (rows.length === 0) {
      throw new Error("No data to insert");
    }

    // Add placeholders for the three additional values
    const additionalValues = [vahedName, provinceName, '1']; // Replace with actual values

    // Determine column names (n+3 columns)
    const columns = rows[0].map((_, index) => `col_${index}`).join(", ") + `, col_${rows[0].length}, col_${rows[0].length + 1}, col_${rows[0].length + 2}`;

    // Define maximum statement size (in bytes)
    const maxStatementSize = 1024 * 1024; // 1024 KB

    // Insert rows into the database using extended insert statements
    let insertQuery = `INSERT INTO table_${tableID} (${columns}) VALUES `;
    let currentSize = insertQuery.length;
    const queries: string[] = [];
    const queryParams: any[] = [];
    let valuesPart = "";

    rows.forEach((row, rowIndex) => {
      // Add the additional values to each row
      const fullRow = row.concat(additionalValues);

      // Cleanse the row values to prevent SQL injection
      const cleanedRow = fullRow.map(value => DB.conn.escape(value));

      const rowPlaceholder = `(${cleanedRow.map(() => "?").join(", ")})`;
      valuesPart += rowPlaceholder + ", ";
      cleanedRow.forEach((value) => queryParams.push(value));

      currentSize += rowPlaceholder.length;

      // If current size exceeds max statement size or it's the last row, create a new query
      if (currentSize > maxStatementSize || rowIndex === rows.length - 1) {
        valuesPart = valuesPart.slice(0, -2); // Remove trailing comma and space
        queries.push(insertQuery + valuesPart);
        valuesPart = "";
        currentSize = insertQuery.length;
      }
    });

    const connection = await DB.conn.getConnection();
    await connection.beginTransaction();
    try {
      // Delete rows where the value of the approve column is 1
      const deleteQuery = `DELETE FROM ${"table_"+tableID} WHERE approve = 1 AND vahed = ${vahedName}`;
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
      // Clean up the uploaded file
      await fsExtra.remove(filePath);
    }

}


async function excelPluginUpload(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {

  // todo: token validation

  const tableID = request.params.tableID;

  const data = await request.file();
  if (!data) {
    reply.status(400).send({ success: false, message: "No file uploaded" });
    return;
  }
    
  const uploadDir = path.join(__dirname, "uploads");
  await fsExtra.ensureDir(uploadDir); // Ensure the uploads directory exists
  const filePath = path.join(uploadDir, data.filename);

  const fileWriteStream = fs.createWriteStream(filePath);

  // Pipe the file stream to the write stream
  data.file.pipe(fileWriteStream);

  // Wait for the file to finish writing
  await new Promise<void>((resolve, reject) => {
    fileWriteStream.on("finish", resolve);
    fileWriteStream.on("error", reject);
  });

  try {
    // Now that the file is fully saved, proceed with database insertion
    await uploadExcelToDatabase(filePath, tableID, reply);
    reply.send({ success: true, message: "Data uploaded and inserted successfully" });
  } catch (error) {
    reply.status(500).send({ success: false, message: "Error uploading and inserting data", error });
  } finally {
    // Clean up the uploaded file
    if (await fsExtra.pathExists(filePath)) {
      await fsExtra.remove(filePath);
    }
  }
}

// async function provinceApprove(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  // let jbody: TableRecall;
  // try {
  //   jbody = request.body as TableRecall;
  // } catch (e: unknown) {
  //   await reply.code(400).send({ message: "badrequestt" });
  //   throw new Error();
  // }

  // const token = jbody.token;
  // const tableID: string = jbody.tableID;

  // try {
  //   const user = await validateToken(token);
  //   if (user === null) {
  //     await reply.code(401).send({ message: "not authenticated" });
  //     return;
  //   }
  //   const user_val = JSON.parse(user) as User;
  //   if (!await checkExcelReadAccess(user_val.id, Number(tableID), "read")) {
  //     await reply.code(403).send({ message: "forbidden" });
  //     return;
  //   }

  //   // Extract filters
  //   const filters: filter[] = jbody.filters?.map(([columnName, contain]) => ({ columnName, contain })) || [];

  //   // Pass filters to the tableDataOutput function if needed
  //   await tableDataOutput(tableID, reply, filters, jbody.pageNumber, jbody.pageSize);

  //   return;
  // } catch (e: unknown) {
  //   logError(e);
  //   await reply.code(500);
  //   throw new Error();
  // }
// }

export function ExcelFileAPI(fastifier: fastify.FastifyInstance, prefix?: string): void {

  fastifier.post(`${prefix ?? ""}/upload-excel/:tableID`, excelPluginUpload);
  fastifier.post(`${prefix ?? ""}/export-excel-branch/:tableID`, excelPluginDownloadVahed);
  fastifier.post(`${prefix ?? ""}/export-excel-province/:tableID`, excelPluginDownloadProvince);

}
