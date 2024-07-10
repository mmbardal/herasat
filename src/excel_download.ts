import ExcelJS from "exceljs";
import { DB } from "./db";
import type { MySQLRowDataPacket } from "@fastify/mysql";
import type * as fastify from "fastify";
import { logError } from "./logger";
import { checkExcelReadAccess, validateToken } from "./check";
import type { User } from "./apis/v1/login";
import type { excelRequests } from "./schema/panel";

interface ColumnProperties {
  name: string;
}

interface Column extends MySQLRowDataPacket {
  columns_properties: ColumnProperties[] | null;
}


// Function to query database, convert to Excel, and download
export async function exportTableToExcelVahed(tableID: string, vahedName: string): Promise<Buffer> {
  try {
    // Query the table to get the headers JSON
    const [jsonRows] = await DB.conn.execute<Column[]>(
      `SELECT columns_properties
       FROM all_tables
       WHERE table_id = ?;`,
      [tableID]
    );

    if (jsonRows.length === 0 || jsonRows[0].columns_properties === null) {
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

    let query = `SELECT * FROM table_${tableID}`;
    try {
      const columnQuery = `
        SELECT COUNT(*) AS column_count
        FROM information_schema.columns
        WHERE table_schema = ?
        AND table_name = ?;
      `;
  
      const databaseName = 'herasat';
      const tableName = "table_"+tableID;
      const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(columnQuery, [databaseName, tableName]);
  
      if (rows.length > 0) {
        query += ` WHERE col_${rows[0].column_count - 3} = "${vahedName}"`;
      } else {
        throw new Error(`Table ${tableName} not found in database ${databaseName}.`);
      }
    } catch (error) {
      console.error("Error retrieving column count:", error);
      throw error;
    }

    // Execute the query to get the data
    const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(query);


    // Add rows
    for (const row of rows) {
        const rowData: unknown[] = [];
        const keys = Object.keys(row);
        const keysToInclude = keys.slice(0, -3); // Exclude the last three keys
      
        for (const key of keysToInclude) {
          rowData.push(row[key]);
        }
        
        //console.log(rowData); // To verify the rowData contents
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

export async function exportTableToExcelProvince(tableID: string, provinceName: string): Promise<Buffer> {
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

    let query = `SELECT * FROM table_${tableID}`;
    try {
      const columnQuery = `
        SELECT COUNT(*) AS column_count
        FROM information_schema.columns
        WHERE table_schema = ?
        AND table_name = ?;
      `;
  
      const databaseName = 'herasat';
      const tableName = "table_"+tableID;
      const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(columnQuery, [databaseName, tableName]);
  
      if (rows.length > 0) {
        query += ` WHERE col_${rows[0].column_count - 2} = "${provinceName}"`;
      } else {
        throw new Error(`Table ${tableName} not found in database ${databaseName}.`);
      }
    } catch (error) {
      console.error("Error retrieving column count:", error);
      throw error;
    }

    // Execute the query to get the data
    const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(query);


    // Add rows
    for (const row of rows) {
        const rowData: any[] = [];
        const keys = Object.keys(row);
      
        for (const key of keys) {
          rowData.push(row[key]);
        }
        
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

export async function excelPluginDownloadVahed(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {

  let jbody: excelRequests;
  try {
    jbody = request.body as excelRequests;
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequestt" });
    throw new Error();
  }

  const token = jbody.token;
  const tableID: string = jbody.tableID;
  let vahedName = jbody.vahedName as string;

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
    //vahedName = user_val.branch;

  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }
  
  try {
    const buffer = await exportTableToExcelVahed(tableID, vahedName);
    reply
      .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .header("Content-Disposition", `attachment; filename=export.xlsx`)
      .send(buffer);
  } catch (e: unknown) {
    logError(e);
    reply.status(500).send({ success: false, message: "Error exporting Excel file", e });
  }
}

export async function excelPluginDownloadProvince(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {

let jbody: excelRequests;
  try {
    jbody = request.body as excelRequests;
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequestt" });
    throw new Error();
  }

  const token = jbody.token;
  const tableID: string = jbody.tableID;
  let provinceName = jbody.provinceName as string;

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

    //provinceName = user_val.province;

  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }
  
  try {
    const buffer = await exportTableToExcelProvince(tableID, provinceName);
    reply
      .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .header("Content-Disposition", `attachment; filename=export.xlsx`)
      .send(buffer);
  } catch (error) {
    reply.status(500).send({ success: false, message: "Error exporting Excel file", error });
  }
}
  