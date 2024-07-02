import { FastifyReply, FastifyRequest } from "fastify";
import { DB } from "./db";
import type { MySQLRowDataPacket } from "@fastify/mysql";

// Function to extract column names and generate JSON output
export async function generateTableJsonOutput(
  tableID: string, 
  reply: FastifyReply
): Promise<void> {
    const tableName = "table_"+tableID;
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

    // Step 2: Select all data from the table using tableName
    const [rows] = await DB.conn.execute<MySQLRowDataPacket[]>(`SELECT * FROM ${tableName}`);

    // Step 3: Create JSON output
    const jsonOutput = rows.map((row) => {
      const rowObject: { [key: string]: any } = {};
      for (const columnName of columnNames) {
        rowObject[columnName] = row[columnName];
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

// // Usage in a Fastify route
// import type { FastifyPluginCallback } from "fastify";

// interface RequestBody {
//   tableName: string;
//   tableID: string;
// }

// const tableJsonPlugin: FastifyPluginCallback = (fastify, _options, done) => {
//   fastify.post<{ Body: RequestBody }>("/generate-table-json", async (request, reply) => {
//     const { tableName, tableID } = request.body;
//     await generateTableJsonOutput(tableName, tableID, reply);
//   });

//   done();
// };

// export default tableJsonPlugin;
