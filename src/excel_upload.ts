import { DB } from "./db";
import ExcelJS from "exceljs";
import * as fs from "fs";
import * as fsExtra from "fs-extra";
import * as path from "path";
import { FastifyPluginCallback, FastifyRequest } from "fastify";
import fastifyMultipart from "@fastify/multipart";
import { fileURLToPath } from 'url';

// Equivalent to `__dirname` in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RequestParams {
  tableID: string;
}

// Function to upload and insert data from Excel to MySQL
async function uploadExcelToDatabase(filePath: string, tableID: string) {
  try {
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

    // Determine column names
    const columns = rows[0].map((_, index) => `col_${index}`).join(", ");

    // Define maximum statement size (in bytes)
    const maxStatementSize = 1024 * 1024; // 1024 KB

    // Insert rows into the database using extended insert statements
    let insertQuery = `INSERT INTO table_${tableID} (${columns}) VALUES `;
    let currentSize = insertQuery.length;
    const queries: string[] = [];
    const queryParams: any[] = [];
    let valuesPart = "";

    rows.forEach((row, rowIndex) => {
      const rowPlaceholder = `(${row.map(() => "?").join(", ")})`;
      valuesPart += rowPlaceholder + ", ";
      row.forEach((value) => queryParams.push(value));

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
    await connection.beginTransaction();  //conn.escape() for cleaning
    try {
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



const excelPluginUpload: FastifyPluginCallback = (fastify, _options, done) => {
  // Register the multipart plugin
  fastify.register(fastifyMultipart);

  // Define the route to upload Excel file
  fastify.post<{ Params: RequestParams }>(
    "/upload-excel/:tableID",
    async (
      request: FastifyRequest<{
        Params: RequestParams;
      }>,
      reply
    ) => {
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
        await uploadExcelToDatabase(filePath, tableID);
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
  );

  done();
};

export default excelPluginUpload;
