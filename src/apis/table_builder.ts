import { DB } from "../db";
import { MySQLRowDataPacket } from "@fastify/mysql";

export async function tableBuilder(tableName: string): Promise<void> {
  const [value] = await DB.conn.query<MySQLRowDataPacket[]>(`select * from all_tables where table_name_FA = ?`,[tableName]);
  const columns = value[0]["columns"].length;
  const name = "table_"+value[0]["table_id"]
  let queryField:string = ""
  for (let i =0;i<columns+3;i++){
    if(i == columns+2){
      queryField += `col_${i} varchar(255)`
    }
    else{
      queryField += `col_${i} varchar(255),`
    }

  }
  await DB.conn.query<MySQLRowDataPacket[]>(`create table ${name}(${queryField});`)

}