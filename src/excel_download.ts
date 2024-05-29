import { DB } from "./db";
import type { MySQLRowDataPacket } from "@fastify/mysql";
import * as ExcelJS from "exceljs";
import type { FastifyPluginCallback } from "fastify";

// Function to query database, convert to Excel, and download
export async function exportTableToExcel(tableID: string, filename: string) {
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

    const columnsProperties = jsonRows[0].columns_properties;
    // Extract column names from JSON objects
    const headerNames: string[] = columnsProperties.map((item: any) => item.name);

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1");

    // Add headers as the first row
    worksheet.addRow(headerNames);

    // Add enough rows to ensure that all cells in the column are initialized
    // for (let i = 0; i < 100; i++) { // Assuming you want to initialize 10 rows
    //     worksheet.addRow(["a","a","c","b"]);
    // }

    // Set column validations based on model and apply not nullable rule
    //     columnsProperties.forEach((item: any, index: number) => {
    //       const columnIndex = index + 1; // ExcelJS column index starts from 1
    //       const column = worksheet.getColumn(columnIndex);

    //       if (['date', 'natID', 'mobileNum', 'phoneNum'].includes(item.model)) {
    //           column.eachCell((cell, rowNumber) => {
    //               if (rowNumber > 1) { // Skip the header row
    //                   cell.dataValidation = {
    //                       type: 'custom',
    //                       formulae: [`ISNUMBER(SEARCH("${item.regex}", A${rowNumber}))`],
    //                       showErrorMessage: true,
    //                       errorTitle: 'Invalid input',
    //                       error: `Value must match the pattern: ${item.regex}`
    //                   };
    //               }
    //           });
    //       } else if (item.model === 'comboBox') {
    //           //var colNum = 0;
    //           // column.eachCell((cell) => {
    //           //   cell.dataValidation = {
    //           //     type: 'list',
    //           //     allowBlank: false,
    //           //     formulae: ['"One,Two,Three,Four"'],
    //           //     showErrorMessage: true,
    //           //     errorTitle: 'Invalid input',
    //           //     error: `Value must be one of:`
    //           //   }
    //           //   //colNum = parseInt(cell.col);
    //           // });

    //           //for (let j = 2; j <= 50; j++)
    //           //{
    //             //let cellName = numberToColumnTitle(colNum) + j;
    //             //console.log(numberToColumnTitle(i) + " --------- " + j.toString)
    //             worksheet.getCell("A0").dataValidation = {
    //               type: 'list',
    //               allowBlank: false,
    //               formulae: ['"One,Two,Three,Four"'],
    //               showErrorMessage: true,
    //               errorTitle: 'Invalid input',
    //               error: `Value must be one of:`
    //             }
    //           //}
    //       }

    //       // Apply not nullable rule
    //       column.eachCell((cell, rowNumber) => {
    //           if (rowNumber > 1) { // Skip the header row
    //               cell.dataValidation = {
    //                   ...cell.dataValidation,
    //                   type: 'custom',
    //                   formulae: ['LEN(TRIM(A2))>0'],
    //                   showErrorMessage: true,
    //                   errorTitle: 'Invalid input',
    //                   error: 'This field cannot be empty'
    //               };
    //           }
    //       });
    //   });

    // Execute the query to get the data

    // const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(`SELECT * FROM t_${tableID}`);

    // // Add rows
    // for (const row of rows) {
    //     const rowData: any[] = [];
    //     for (const key in row) {
    //         rowData.push(row[key]);
    //     }
    //     worksheet.addRow(rowData);
    // }

    // Write to file
    await workbook.xlsx.writeFile(filename);

    console.log("Excel file exported successfully!");
  } catch (error) {
    console.error("Error exporting Excel file:", error);
    throw error;
  }
}

function numberToColumnTitle(n: number) {
  let result = "";
  while (n > 0) {
    let remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

interface RequestParams {
  tableID: string;
}

const excelPluginDownload: FastifyPluginCallback = (fastify, options, done) => {
  // Define the route to export Excel file
  fastify.post<{ Params: RequestParams }>("/export-excel/:tableID", async (request, reply) => {
    const tableID = request.params.tableID;
    const filename = "export.xlsx"; // You can customize the filename as needed
    try {
      await exportTableToExcel(tableID, filename);
      reply.send({ success: true, message: "Excel file exported successfully" });
    } catch (error) {
      reply.status(500).send({ success: false, message: "Error exporting Excel file", error });
    }
  });

  done();
};

export default excelPluginDownload;
