import { FastifyReply } from "fastify";
import { DB } from "./db";
import type { MySQLRowDataPacket } from "@fastify/mysql";
import { filter } from "./schema/panel";

export async function columnNamesOutput(
  tableID: string, 
  reply: FastifyReply
): Promise<void> {
  try {
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

    const columns_properties: { name: string }[] = jsonRows[0].columns_properties;
    const columnNames = columns_properties.map((item) => item.name);

    reply.status(200).send(columnNames);
  } catch (error) {
    console.error("Error generating JSON output:", error);
    reply.status(500).send({ success: false, message: "Error generating JSON output", error });
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
    let query = `SELECT * FROM ${tableName}`;
    if (filtering.length > 0) {
      query += ` WHERE ${filtering[0].columnName} LIKE '%${DB.conn.escape(filtering[0].contain)}%'`;
      for (let i = 1; i < filtering.length; i++) {
        query += ` AND ${filtering[i].columnName} LIKE '%${DB.conn.escape(filtering[i].contain)}%'`;
      }
    }
    query += ` LIMIT ${pageSize} OFFSET ${offset}`; // Add LIMIT and OFFSET for pagination

    const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(query);
    if (rows.length === 0 || !rows[0].columns_properties) {
      reply.status(404).send({ success: false, message: "Table ID not found or column properties not available" });
      return;
    }

    reply.status(200).send(rows);
  } catch (error) {
    console.error("Error generating JSON output:", error);
    reply.status(500).send({ success: false, message: "Error generating JSON output", error });
  }
}
