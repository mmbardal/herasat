import { DB } from "@/db";
import { MySQLRowDataPacket } from "@fastify/mysql";
import { RedisDB } from "@/redis_db";
import { logError } from "@/logger";

export async function validateToken(token: string): Promise<string | null> {
  try {
    return await RedisDB.conn().get(token);
  } catch (e: unknown) {
    logError(e as Error);
    //console.log(e.message);
    throw new Error();
  }
}

export async function checkPermission(token: string, permission: string): Promise<boolean> {
  try {
    const value = await RedisDB.conn().get(token);
    const user = JSON.parse(value ?? '') as Record<string, unknown>;
    return user[permission] == 1;
  } catch (e: unknown) {
    logError(e as Error);
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


export async function changeReadAccessFunc(tableId:number,userId:number,value:string){
  const [val] = await DB.conn.execute<MySQLRowDataPacket[]>(
    `select *  from access_permissions  where table_id = ? and user_id = ?` ,
    [tableId,userId]
  );
  if(val.length!=0) {
    await DB.conn.execute<MySQLRowDataPacket[]>(
      `update access_permissions SET permission = ? where user_id = ? and table_id= ?` ,
      [value,userId,tableId]
    );
    return;
  }

  await DB.conn.query<MySQLRowDataPacket[]>(`insert into access_permissions(table_id, user_id, permission) values (?,?,?)`,[tableId,userId,value]);

}
