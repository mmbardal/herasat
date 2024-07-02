import { FastifyReply } from "fastify";
import { DB } from "./db";
import { ColumnProperties } from "./schema/panel";
import type { MySQLRowDataPacket } from "@fastify/mysql";

// Function to extract column names and generate JSON output
export async function generateTableJsonOutput(
  tableID: string, 
  reply: FastifyReply
): Promise<void> {
    const tableName = "table_"+tableID;
    try {
      const [value] = await DB.conn.query<MySQLRowDataPacket[]>(`select * from all_tables where table_name_FA = "jack"`);
      console.log(value[0] + "GGGGG");
      const columns = value[0]["columns_properties"][0].model;
      console.log(columns + "FFFFF");


      // Step 1: Get column names from columns_properties using tableID
      const [jsonRows] = await DB.conn.execute<MySQLRowDataPacket[]>(
        `SELECT columns_properties
         FROM all_tables
         WHERE table_id = ?;`,
        [tableID]
      );
    
      if (jsonRows.length === 0 || !jsonRows[0].columns_properties) {
        reply.status(404).send({ success: false, message: "Table ID not found or column properties not available" });
        return;
      }
  
      const colProperties: ColumnProperties[] = jsonRows[0].columns_properties;
  
      const columnNames = colProperties.map((item) => item.name);
  
      // Step 2: Select all data from the table using tableName
      const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(`SELECT * FROM ${tableName}`);
  
      // Create a mapping of placeholder column names to actual column names
      const placeholderToActualColumnMap: { [key: string]: string } = {};
      columnNames.forEach((actualName, index) => {
        placeholderToActualColumnMap[`col_${index}`] = actualName;
      });
  
      // Step 3: Create JSON output
      const jsonOutput = rows.map((row) => {
        const rowObject: { [key: string]: any } = {};
        for (const [placeholder, actualName] of Object.entries(placeholderToActualColumnMap)) {
          rowObject[actualName] = row[placeholder];
        }
        return rowObject;
      });
  
      // Step 4: Send JSON response
      reply.status(200).send(jsonOutput);
    } catch (error) {
    console.error("Error generating JSON output:", error);
    reply.status(500).send({ success: false, message: "Error generating JSON output", error });
  }
}
