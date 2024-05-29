import { DB } from "./db";
import * as ExcelJS from "exceljs";
import * as fs from "fs-extra";
import * as path from "path";
import { FastifyPluginCallback, FastifyRequest } from "fastify";
import fastifyMultipart from "@fastify/multipart";

interface RequestParams {
  tableID: string;
}

interface MultipartFile {
  toBuffer: () => Promise<Buffer>;
  file: NodeJS.ReadableStream;
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
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

    // Insert rows into the database
    const columns = rows[0].map((_, index) => `column${index + 1}`).join(", ");
    const placeholders = rows[0].map(() => "?").join(", ");

    const insertQuery = `INSERT INTO t_${tableID} (${columns})
                         VALUES (${placeholders})`;
    const connection = await DB.conn.getConnection();
    try {
      for (const row of rows) {
        await connection.execute(insertQuery, row);
      }
    } finally {
      connection.release();
    }

    console.log("Data inserted successfully!");
  } catch (error) {
    console.error("Error uploading and inserting data:", error);
    throw error;
  } finally {
    // Clean up the uploaded file
    await fs.unlink(filePath);
  }
}

const excelPluginUpload: FastifyPluginCallback = (fastify, options, done) => {
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

      const filePath = path.join(__dirname, "uploads", data.filename);

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
        if (await fs.pathExists(filePath)) {
          await fs.unlink(filePath);
        }
      }
    }
  );

  done();
};

export default excelPluginUpload;
