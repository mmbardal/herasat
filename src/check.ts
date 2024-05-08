import { DB } from "./db";
import { MySQLRowDataPacket } from "@fastify/mysql";

import { RedisDB } from "./redis_db";
import { redisHost, redisPort } from "./constatnts";

import { logError } from "./logger";
import { error } from "console";

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

export async function checkExcelReadAccess(id: number, ExcelId: number): Promise<boolean> {
  const [value] = await DB.conn.query<MySQLRowDataPacket[]>(`select *
    from excelreadaccess
    where excel_id = ${id}
      and user_id = ${ExcelId}`);
  return value.length != 0;
}
