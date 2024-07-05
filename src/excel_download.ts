import ExcelJS from "exceljs";
import { DB } from "./db";
import type { MySQLRowDataPacket } from "@fastify/mysql";
import { fastify } from "fastify";

interface ColumnProperties {
  name: string;
}

// Function to query database, convert to Excel, and download
export async function exportTableToExcelVahed(tableID: string): Promise<Buffer> {
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
    // Extract column names from JSON objects, excluding the last three
    const headerNames: string[] = columnsProperties.slice(0, -3).map((item: ColumnProperties) => item.name);


    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1");

    // Add headers as the first row
    worksheet.addRow(headerNames);

    // Execute the query to get the data
    const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(`SELECT * FROM table_${tableID}`);

    // Add rows
    for (const row of rows) {
        const rowData: any[] = [];
        const keys = Object.keys(row);
        const keysToInclude = keys.slice(0, -3); // Exclude the last three keys
      
        for (const key of keysToInclude) {
          rowData.push(row[key]);
        }
        
        console.log(rowData); // To verify the rowData contents
        worksheet.addRow(rowData); // Add the rowData to the worksheet
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

export async function exportTableToExcelProvince(tableID: string): Promise<Buffer> {
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
    const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(`SELECT * FROM table_${tableID}`);

    // Add rows
    for (const row of rows) {
      const rowData: any[] = [];
      for (const key in row) {
        rowData.push(row[key]);
        console.log(rows.length);
      }
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

export async function excelPluginDownloadVahed(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  const tableID = request.params.tableID;
  const vahedName = "edg"; // todo: handle from branch user and edit SQL query
  try {
    const buffer = await exportTableToExcelVahed(tableID);
    reply
      .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .header("Content-Disposition", `attachment; filename=export.xlsx`)
      .send(buffer);
  } catch (error) {
    reply.status(500).send({ success: false, message: "Error exporting Excel file", error });
  }
}

export async function excelPluginDownloadProvince(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  const tableID = request.params.tableID;
  const provinceName = "edg"; // todo: handle from branch user and edit SQL query
  try {
    const buffer = await exportTableToExcelProvince(tableID);
    reply
      .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .header("Content-Disposition", `attachment; filename=export.xlsx`)
      .send(buffer);
  } catch (error) {
    reply.status(500).send({ success: false, message: "Error exporting Excel file", error });
  }
}
  