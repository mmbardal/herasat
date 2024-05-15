import { DB } from "./db";
import { MySQLRowDataPacket } from "@fastify/mysql";
import * as ExcelJS from 'exceljs';

// Function to query database, convert to Excel, and download
export async function exportTableToExcel(tableID: string, filename: string) {
  try {
      // Query the table to get the headers JSON
      const [jsonRows] = await DB.conn.execute<MySQLRowDataPacket[]>(
          `SELECT columns_properties FROM all_tables WHERE table_id = ?;`, [tableID]);

      if (jsonRows.length === 0 || !jsonRows[0].columns_properties) {
          throw new Error("Table ID not found or headers not available");
      }

      // Extract column names from JSON objects
      const headerNames: string[] = jsonRows[0].columns_properties.map((item: any) => item.name);

      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');

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

      // Write to file
      await workbook.xlsx.writeFile(filename);

      console.log('Excel file exported successfully!');
  } catch (error) {
      console.error('Error exporting Excel file:', error);
      throw error;
  }
}








import { FastifyPluginCallback } from 'fastify';

interface RequestParams {
  tableID: string;
}

const excelPlugin: FastifyPluginCallback = (fastify, options, done) => {
  // Define the route to export Excel file
  fastify.post<{ Params: RequestParams }>('/export-excel/:tableID', async (request, reply) => {
    const tableID = request.params.tableID;
    const filename = 'output.xlsx'; // You can customize the filename as needed
    try {
      await exportTableToExcel(tableID, filename);
      reply.send({ success: true, message: 'Excel file exported successfully' });
    } catch (error) {
      reply.status(500).send({ success: false, message: 'Error exporting Excel file', error });
    }
  });

  done();
};

export default excelPlugin;
