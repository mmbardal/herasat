import { DB } from "../db";
import { MySQLRowDataPacket } from "@fastify/mysql";

export async function tableBuilder(tableName: string): Promise<void> {
  const [value] = await DB.conn.query<MySQLRowDataPacket[]>(`select * from all_tables where table_name_FA = ?`,[tableName]);
  console.log(value[0]);
  const columns = value[0]["columns_properties"].length;
  console.log(columns);
  const name = "table_"+value[0]["table_id"]
  console.log(name);
  let queryField:string = ""
  console.log(name);
  for (let i =0;i<columns;i++){
    let type = value[0]["columns_properties"][0].model;
    if (type == "phoneNumber" || type == "homeNumber" || type == "nationalCode" || type == "decimal"){
      type = "BIGINT";
    }
    else{
      type = "varchar(255)"
    }
    if(i == columns-1){
      queryField += `col_${i} ${type}`
    }
    else{
      queryField += `col_${i} ${type},`
    }
    console.log(i);
  }
  
  console.log(queryField);
  await DB.conn.query<MySQLRowDataPacket[]>(`create table ${name}(${queryField});`)

}

export interface AddColumns {
  token: string;
  tableID: string;
  columns: Column[]
}

export interface Column {
  name: string;
  type: string;
  constraints?: string;
}

export async function addColumnsToTable(tableID: string, tableName: string, columns: Column[]): Promise<void> {
  let queryField = "";
  
  columns.forEach((column, index) => {
    queryField += `ADD COLUMN ${column.name} ${column.type}`;
    if (column.constraints) {
      queryField += ` ${column.constraints}`;
    }
    if (index < columns.length - 1) {
      queryField += ", ";
    }
  });

  const query = `ALTER TABLE ${tableName} ${queryField};`;
  await DB.conn.query<MySQLRowDataPacket[]>(query);
  await DB.conn.query(
    `update all_tables
     set approval_level = 0
     where table_id = ?`,
    [tableID]
  );
}

// Usage example
/*
(async () => {
  await addColumnsToTable('employees', [
    { name: 'email', type: 'VARCHAR(255)', constraints: 'UNIQUE' },
    { name: 'hire_date', type: 'DATE', constraints: 'DEFAULT CURRENT_DATE' },
  ]);
})();
*/
