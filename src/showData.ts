import { FastifyReply } from "fastify";
import { DB } from "./db";
import type { MySQLRowDataPacket } from "@fastify/mysql";
import { ColumnProperties, filter } from "./schema/panel";

export async function columnNamesOutput(
  tableID: string
): Promise<{ [key: string]: string } | { success: boolean; message: string }> {
  try {
    const [jsonRows] = await DB.conn.execute<MySQLRowDataPacket[]>(
      `SELECT columns_properties
       FROM all_tables
       WHERE table_id = ?;`,
      [tableID]
    );
    if (jsonRows.length === 0 || !jsonRows[0].columns_properties) {
      return { success: false, message: "Table ID not found or column properties not available" };
    }

    const columns_properties: ColumnProperties[] = jsonRows[0].columns_properties;
    const columnNames = columns_properties.map((item) => item.name);

    const result: { [key: string]: string } = {};
    columnNames.forEach((name, index) => {
      result[`col_${index + 1}`] = name;
    });

    return result;
  } catch (error) {
    const text = error as string;
    console.error("Error generating JSON output:", error);
    return { success: false, message: "Error generating JSON output", text};
  }
}


export async function tableDataOutput(
  tableID: string,
  filtering: filter[], 
  reply: FastifyReply,
  pageNumber: number = 1, // Default page number to 1 if not provided
  pageSize: number = 100
): Promise<void> {
  const tableName = "table_" + tableID;
  const offset = (pageNumber - 1) * pageSize; // Calculate offset based on page number

  try {
    // Get the schema from columnNamesOutput
    const schemaResult = await columnNamesOutput(tableID);

    if ('success' in schemaResult && !schemaResult.success) {
      if ('message' in schemaResult && schemaResult.message == "Table ID not found or column properties not available") {
        reply.status(404).send(schemaResult);
      }
      else
      {
        reply.status(500).send(schemaResult);
      }
    }

    let query = `SELECT * FROM ${tableName}`;
    if (filtering.length > 0) {
      query += ` WHERE ${filtering[0].columnName} LIKE '%${filtering[0].contain}%'`;
      for (let i = 1; i < filtering.length; i++) {
        query += ` AND ${filtering[i].columnName} LIKE '%${filtering[i].contain}%'`;
      }
    }
    
    query += ` LIMIT ${pageSize} OFFSET ${offset}`; // Add LIMIT and OFFSET for pagination

    console.log(query)

    const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(query);
    if (rows.length === 0) {
      reply.status(404).send({ success: false, message: "Table ID not found or column properties not available" });
      return;
    }

    reply.status(200).send({ schema: schemaResult, info: rows });
  } catch (error) {
    console.error("Error generating JSON output:", error);
    reply.status(500).send({ success: false, message: "Error generating JSON output", error });
  }
}
