import type * as fastify from "fastify";
import { logError } from "@/logger";
import { validateToken } from "@/check";
import type { User } from "@/apis/v1/login";
import { DB } from "@/db";
import type { MySQLRowDataPacket } from "@fastify/mysql";
import type { GetTableBranchType } from "@/schema/vahed";

async function table(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: GetTableBranchType;
  try {
    jbody = request.body as GetTableBranchType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequest" });
    logError(e);
    throw new Error();
  }

  const token = jbody.token;
  const branchID : number = jbody.branchId;
  const pageNum = jbody.offset - 1;
  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    const user_val = JSON.parse(user) as User;
    const role = user_val.role;

    console.log(role);

    if (role === "user" || role === "supervisor") {
      const [allData] = await DB.conn.query<MySQLRowDataPacket[]>(
        `select count(*)
         from access_permissions where user_id = ?`,[branchID]
      );


      const [value] = await DB.conn.query<MySQLRowDataPacket[]>(
        `select all_tables.table_id, access_permissions.permission, access_permissions.user_id , all_tables.table_name_FA
         from all_tables
                  inner join access_permissions on all_tables.table_id = access_permissions.table_id and access_permissions.user_id = ? limit 100 offset ?
        `,
        [branchID,pageNum*100]
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      await reply.code(200).send({ tables: value, "number of all data": allData[0]["count(*)"] });
    }

    return;
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }
}
export function GetListBranchAPI(fastifier: fastify.FastifyInstance, prefix?: string): void {

  fastifier.post(`${prefix ?? ""}/gettablebranch`, table);

}