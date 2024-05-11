import { DB } from "./db";
import { MySQLRowDataPacket } from "@fastify/mysql";
import * as ExcelJS from 'exceljs';

// Function to query database, convert to Excel, and download
export async function exportTableToExcel(tableID: string, filename: string) {
    
    try {
        // Query the table to get the headers JSON
        const [jsonRows] = await DB.conn.execute<MySQLRowDataPacket[]>(
            `SELECT column_names_FA FROM all_tables WHERE table_id = ?;`, [tableID]);

        if (jsonRows.length === 0) {
            throw new Error("Table ID not found or headers not available");
        }

        const headersJSON = jsonRows[0].excel_headers;
        const headers = JSON.parse(headersJSON);

        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet1');

        // Add headers as the first row
        worksheet.addRow(headers);

        // Execute the query to get the data
        const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(`SELECT * FROM ${tableID}`);

        // Add rows
        for (const row of rows) {
            const rowData: any[] = [];
            for (const header of headers) {
                rowData.push(row[header]);
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
