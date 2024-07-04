import { FastifyReply, FastifyRequest } from "fastify";
import { DB } from "./db";
import type { MySQLRowDataPacket } from "@fastify/mysql";
import { filter } from "./schema/panel";

// Function to extract column names and generate JSON output
export async function columnNamesOutput(
  tableID: string, 
  reply: FastifyReply
): Promise<void> {

  try {
    // Step 1: Get column names from col_properties using tableID
    const [jsonRows] = await DB.conn.execute<MySQLRowDataPacket[]>(
      `SELECT col_properties
       FROM all_tables
       WHERE table_id = ?;`,
      [tableID]
    );

    if (jsonRows.length === 0 || !jsonRows[0].col_properties) {
      reply.status(404).send({ success: false, message: "Table ID not found or column properties not available" });
      return;
    }

    const colProperties: { name: string }[] = jsonRows[0].col_properties;
    const columnNames = colProperties.map((item) => item.name);

    reply.status(200).send(columnNames);
  } catch (error) {
    console.error("Error generating JSON output:", error);
    reply.status(500).send({ success: false, message: "Error generating JSON output", error });
  }
}


export async function tableDataOutput(
  tableID: string,
  filtering: filter[], 
  reply: FastifyReply
): Promise<void> {
  const tableName = "table_"+tableID;
  try {
    let query = `SELECT * FROM ${tableName}`
    if (filtering.length > 0)
    {
      query += ` WHERE ${filtering[0].columnName} LIKE '%${DB.conn.escape(filtering[0].contain)}%'`
      for (let i = 1; i < filtering.length; i++)
      {
        query += ` AND ${filtering[i].columnName} LIKE '%${DB.conn.escape(filtering[i].contain)}%'`
      }
    }
    const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(query);

    reply.status(200).send(rows);
  } catch (error) {
    console.error("Error generating JSON output:", error);
    reply.status(500).send({ success: false, message: "Error generating JSON output", error });
  }
}
