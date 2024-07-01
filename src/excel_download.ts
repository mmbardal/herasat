import ExcelJS from "exceljs";
import { DB } from "./db";
import type { MySQLRowDataPacket } from "@fastify/mysql";
import type { FastifyPluginCallback } from "fastify";
import { FastifyReply } from "fastify";

interface ColumnProperties {
  name: string;
}

// Function to query database, convert to Excel, and download
export async function exportTableToExcel(tableID: string): Promise<Buffer> {
  try {
    // Query the table to get the headers JSON
    const [jsonRows] = await DB.conn.execute<MySQLRowDataPacket[]>(
      `SELECT columns_properties
       FROM all_tables
       WHERE table_id = ?;`,
      [tableID]
    );

    if (jsonRows.length === 0 || !jsonRows[0].columns_properties) {
      throw new Error("Table ID not found or headers not available");
    }

    const columnsProperties: ColumnProperties[] = jsonRows[0].columns_properties;
    // Extract column names from JSON objects
    const headerNames: string[] = columnsProperties.map((item: ColumnProperties) => item.name);

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1");

    // Add headers as the first row
    worksheet.addRow(headerNames);

    // Execute the query to get the data
    const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(`SELECT * FROM t_${tableID}`);

    // Add rows
    for (const row of rows) {
      const rowData: any[] = [];
      for (const key in row) {
        rowData.push(row[key]);
      }
      worksheet.addRow(rowData);
    }

    // Write to buffer
    const buffer: Buffer = await workbook.xlsx.writeBuffer() as Buffer;

    console.log("Excel file exported successfully!");
    return buffer;
  } catch (error) {
    console.error("Error exporting Excel file:", error);
    throw error;
  }
}

interface RequestParams {
  tableID: string;
}

const excelPluginDownload: FastifyPluginCallback = (fastify, _options, done) => {
  // Define the route to export Excel file
  fastify.post<{ Params: RequestParams }>("/export-excel/:tableID", async (request, reply: FastifyReply) => {
    const tableID = request.params.tableID;
    try {
      const buffer = await exportTableToExcel(tableID);
      reply
        .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .header("Content-Disposition", `attachment; filename=export.xlsx`)
        .send(buffer);
    } catch (error) {
      reply.status(500).send({ success: false, message: "Error exporting Excel file", error });
    }
  });

  done();
};

export default excelPluginDownload;
