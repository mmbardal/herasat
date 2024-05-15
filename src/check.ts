import { DB } from "./db";
import { MySQLRowDataPacket } from "@fastify/mysql";
import { RedisDB } from "./redis_db";
import { logError } from "./logger";

export async function validateToken(token: string): Promise<string | null> {
  try {
    return await RedisDB.conn()?.get(token);
  } catch (e: any) {
    logError(e);
    console.log(e.message);
    throw new Error();
  }
}

export async function checkPermission(token: string, permission: string): Promise<boolean> {
  try {
    // @ts-ignore
    const value: string = await RedisDB.conn().get(token);
    const user = JSON.parse(value);
    return user[permission] == 1;
  } catch (e: any) {
    logError(e);
    throw new Error();
  }
}

export async function checkExcelReadAccess(id: number, ExcelId: number, access: string): Promise<boolean> {
  const [value] = await DB.conn.query<MySQLRowDataPacket[]>(
    `select *
                                                             from access_permissions
                                                             where table_id = ?
                                                               and user_id = ?
                                                               and permission = ?`,
    [ExcelId, id, access]
  );
  return value.length != 0;
}
