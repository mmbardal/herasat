import type * as fastify from "fastify";
import type {
  ApproveType,
  changePasswordType,
  changePermissionType,
  changeReadWritePermissionType,
  editTable,
  fields,
  filter,
  GetType,
  newTable,
  searchType,
  TableRecall
} from "@/schema/panel";
import { comboRegexGenerator, searchActionType } from "@/schema/panel";

import { DB } from "@/db";

import type { MySQLRowDataPacket } from "@fastify/mysql";
import { logError } from "@/logger";
import { changeReadAccessFunc, checkPermission, validateToken,checkExcelReadAccess } from "@/check";
import { dateRegex, homeNumberRegex, nationalCodeRegex, numbers, phoneNumberRegex } from "@/constants";
import type { AddColumns } from "../table_builder";
import { tableBuilder, addColumnsToTable } from "../table_builder";
import * as bcrypt from "bcrypt";
import type { SetWriteAccess, Vahed } from "@/schema/vahed";
import type { User } from "@/apis/v1/login";
import { validate } from "@/utils";
import { schema } from "@/schema/panel";
//columnNamesOutput removed
import { tableDataOutput } from "@/showData";
//schema
async function cTable(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: newTable;
  try {
    jbody = request.body as newTable;
     //validate<newTable>(jbody,schema.);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequestt" });

    throw new Error();
  }

  const tableName = jbody.tableName;
  const deadline = jbody.deadline;
  const token = jbody.token;
  const fields = jbody.fields;
  console.log(fields);
  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    const userVal = JSON.parse(user) as User;
    if (!await checkPermission(token, "GE")) {
      await reply.code(403).send({ message: "forbidden" });
      return;
    }
    const expertID = userVal.id;

    const [managerIDRows] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select parent_id
       from user
       where id = ?`,
      [userVal.id]
    );
    const [deputyIDRows] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select parent_id
       from user
       where id = ?`,
      [managerIDRows[0].parent_id]
    );
    const [bossIDRows] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select parent_id
       from user
       where id = ?`,
      [deputyIDRows[0].parent_id]
    );
    const managerID = managerIDRows[0].parent_id as number;
    const deputyID = deputyIDRows[0].parent_id as number;
    const bossID = bossIDRows[0].parent_id as number;
    console.log(managerID);
    for (const item of jbody.fields) {
      if (item.model == "comboBox") {
        const combo = item.comboBoxValues;
        item.regex = comboRegexGenerator(combo);
      }
      if (item.model == "phoneNumber") {
        item.regex = phoneNumberRegex;
      }
      if (item.model == "homeNumber") {
        item.regex = homeNumberRegex;
      }
      if (item.model == "nationalCode") {
        item.regex = nationalCodeRegex;
      }
      if (item.model == "decimal") {
        item.regex = numbers;
      }
      if (item.model == "anyThings") {
        item.regex = "";
      }
      if (item.model == "date") {
        item.regex = dateRegex;
      }
      console.log(item);
    }


    const dataField: fields[] = jbody.fields;
    dataField.push(
      {"name": "Branch", "model": "anyThings", "regex": "", "nullable": false, "comboBoxValues": []},
      {"name": "Province", "model": "anyThings", "regex": "", "nullable": false, "comboBoxValues": []},
      {"name": "approvedByProvince", "model": "anyThings", "regex": "", "nullable": false, "comboBoxValues": []}
    )

    console.log(typeof expertID);
    await DB.conn.query(
      `insert into all_tables (table_name_FA, change_lock, emp_id, manager_id, deputy_id, boss_id, approval_level,
                               write_permission, dead_line, columns_properties)
       values (?, 1, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [tableName, expertID, managerID, deputyID, bossID, new Date(deadline), JSON.stringify(dataField)]
    );
    await reply.code(201).send({ message: `${jbody.tableName} defined` });
    return;
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);

    throw new Error();
  }
}
//schema
async function uTable(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: editTable;
  try {
    jbody = request.body as editTable;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequestt" });

    throw new Error();
  }
  const tableID = jbody.tableID;
  const tableName = jbody.tableName;
  const deadline = jbody.deadline;
  const token = jbody.token;
  const fields = jbody.fields;

  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    const userVal = JSON.parse(user) as User;
    if (await checkPermission(token, "GE")) {
      await reply.code(403).send({ message: "forbidden" });
      return;
    }
    const [step] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select approval_level
       from all_tables
       where emp_id = ?
         and table_id = ?`,
      [userVal.id, tableID]
    );
    if (step[0].approval_level != 0) {
      await reply.code(403).send({ message: `you can't changed table in step ${step[0].approval_level}` });
      return;
    }

    const [managerIDRows] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select parent_id
       from user
       where id = ?`,
      [userVal.id]
    );
    const [deputyIDRows] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select parent_id
       from user
       where id = ?`,
      [managerIDRows[0].parent_id]
    );
    const [bossIDRows] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select parent_id
       from user
       where id = ?`,
      [deputyIDRows[0].parent_id]
    );
    const managerID = managerIDRows[0].parent_id as number;
    const deputyID = deputyIDRows[0].parent_id as number;
    const bossID = bossIDRows[0].parent_id as number;
    for (const item of jbody.fields) {
      if (item.model == "comboBox") {
        const combo = item.comboBoxValues;
        item.regex = comboRegexGenerator(combo);
      }
      if (item.model == "phoneNumber") {
        item.regex = phoneNumberRegex;
      }
      if (item.model == "homeNumber") {
        item.regex = homeNumberRegex;
      }
      if (item.model == "nationalCode") {
        item.regex = nationalCodeRegex;
      }
      if (item.model == "decimal") {
        item.regex = numbers;
      }
      if (item.model == "anyThings") {
        item.regex = "";
      }
      if (item.model == "date") {
        item.regex = dateRegex;
      }
      console.log(item);
    }
    await DB.conn.query(
      `update all_tables
       set table_name_FA=?,
           change_lock=?,
           emp_id=?,
           manager_id=?,
           deputy_id=?,
           boss_id=?,
           approval_level=0,
           write_permission=0,
           dead_line=?,
           columns_properties=?
       where table_id = ?`,
      [tableName, userVal.id, managerID, deputyID, bossID, new Date(deadline), fields, tableID]
    );
    await reply.code(202).send({ message: `${tableName} updated` });
    return;
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);

    throw new Error();
  }
}

async function rTable(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: GetType;
  try {
    jbody =request.body as GetType;
     validate<GetType>(jbody,schema.getValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequestt" });

    throw new Error();
  }

  const token = jbody.token;

  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    const userVal = JSON.parse(user) as User;

    const [tables] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select *
       from all_tables
       where emp_id = ?
          or manager_id = ?
          or deputy_id = ?
          or boss_id = ?`,
      [userVal.id, userVal.id, userVal.id, userVal.id]
    );
    await reply.code(200).send(tables);
    return;
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);

    throw new Error();
  }
}
interface step{
  approval_level:number;
}
async function approve(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: ApproveType;
  try {
    jbody =request.body as ApproveType;
     validate<ApproveType>(jbody,schema.approveValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequestt" });

    throw new Error();
  }

  const tableID = jbody.tableID;
  const token = jbody.token;
  const func = jbody.func;
  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    const userVal = JSON.parse(user) as User;
    const role = userVal.role;
    let [table] = await DB.conn.query<MySQLRowDataPacket[]>(`select 1;`) ;
    switch (role) {
      case "boss":
        [table] = await DB.conn.query<MySQLRowDataPacket[]>(
          `select approval_level
           from all_tables
           where boss_id = ?
             and table_id = ?`,
          [userVal.id, tableID]
        );
        break;
      case "deputy":
        [table] = await DB.conn.query<MySQLRowDataPacket[]>(
          `select approval_level
           from all_tables
           where deputy_id = ?
             and table_id = ?`,
          [userVal.id, tableID]
        );
        break;
      case "manager":
        [table] = await DB.conn.query<MySQLRowDataPacket[]>(
          `select approval_level
           from all_tables
           where manager_id = ?
             and table_id = ?`,
          [userVal.id, tableID]
        );
        break;
      case "expert":
        [table] = await DB.conn.query<MySQLRowDataPacket[]>(
          `select approval_level
           from all_tables
           where emp_id = ?
             and table_id = ?`,
          [userVal.id, tableID]
        );
        break;
      default:
        table = [];
    }

    if (table.length == 0) {
      await reply.code(403).send({ message: "forbidden not found your table or your id" });
      return;
    }
    const stepx = table[0] as step;
    const step = stepx.approval_level;

    switch (role) {
      case "boss":
        if (step != 3) {
          await reply.code(403).send({ message: "forbidden" });
          return;
        }
        if (func == "approve") {
          await DB.conn.query(
            `update all_tables
             set approval_level = 4
             where table_id = ?`,
            [tableID]
          );
          const [name] = await DB.conn.query<MySQLRowDataPacket[]>(
            `select table_name_FA
             from all_tables
             where table_id = ? `,
            [tableID]
          );
         
          await DB.conn.query(
            `update all_tables
             set write_permission = 1
             where table_id = ?`,
            [tableID]
          );
          
          await tableBuilder(name[0].table_name_FA as string);
        } else if (func == "disapprove") {
          await DB.conn.query(
            `update all_tables
             set approval_level = 2
             where table_id = ?`,
            [tableID]
          );
        }
        break;
      case "deputy":
        if (step != 2) {
          await reply.code(403).send({ message: "forbidden" });
          return;
        }
        if (func == "approve") {
          await DB.conn.query(
            `update all_tables
             set approval_level = 3
             where table_id = ?`,
            [tableID]
          );
        } else if (func == "disapprove") {
          await DB.conn.query(
            `update all_tables
             set approval_level = 1
             where table_id = ?`,
            [tableID]
          );
        }
        break;
      case "manager":
        if (step != 1) {
          await reply.code(403).send({ message: "forbidden" });
          return;
        }
        if (func == "approve") {
          await DB.conn.query(
            `update all_tables
             set approval_level = 2
             where table_id = ?`,
            [tableID]
          );
        } else if (func == "disapprove") {
          await DB.conn.query(
            `update all_tables
             set approval_level = 0
             where table_id = ?`,
            [tableID]
          );
        }
        break;
      case "expert":
        if (step != 0) {
          await reply.code(403).send({ message: "forbidden" });
          return;
        }
        if (func == "approve") {
          await DB.conn.query(
            `update all_tables
             set approval_level = 1
             where table_id = ?`,
            [tableID]
          );
        } else if (func == "disapprove") {
          await reply.code(403);
          return;
        }
        break;
    }
    await reply.code(202).send({ message: "approval step changed" });
    return;
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);

    throw new Error();
  }
}
// not have schema todo: mostafa
async function reusetable(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: AddColumns;
  try {
    jbody = request.body as AddColumns;
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequestt" });
    throw new Error();
  }

  const token = jbody.token;

  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }

    const tableName = "table_"+jbody.tableID;
    await addColumnsToTable(jbody.tableID, tableName, jbody.columns);
    await reply.code(200).send({ message: "new columns added to table" });
    return;

  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
  }
}

//async function showTablePagination(request: fastify.FastifyRequest, reply: fastify.FastifyReply):Promise<void> {}

async function search(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: searchType;
  try {
    jbody =request.body as searchType;
     validate<searchType>(jbody,schema.searchValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequestt" });

    throw new Error();
  }

  const token = jbody.token;
  const action = jbody.action as searchActionType;
  const name: string = jbody.name;

  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    // const userVal = JSON.parse(user)as User;
    if (action == searchActionType.userSearch) {
      if (!(await checkPermission(token, "SU"))) {
        await reply.code(403).send({ message: "forbidden" });
        return;
      }
      const [value] = await DB.conn.execute<MySQLRowDataPacket[]>(
        "select username,active,expert,management,deputy,role from user where username LIKE  ?",
        [`%${name}%`]
      );
      await reply.code(200).send({
        users: value
      });
      return;
    } else {
      if (!(await checkPermission(token, "ST"))) {
        await reply.code(403).send({ message: "forbidden" });
        return;
      }
      const [value] = await DB.conn.execute<MySQLRowDataPacket[]>(
        "select * from all_tables where all_tables.table_name_FA LIKE  ?",
        [`%${name}%`]
      );
      await reply.code(200).send({
        tables: value
      });
      return;
    }
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);

    throw new Error();
  }
}

async function changePermission(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  const perms: string[] = [];
  perms.push("SU", "ST", "AU", "GE", "changeReadAccess");
  let jbody: changePermissionType;
  try {
    jbody = request.body as changePermissionType;
     validate<changePermissionType>(jbody,schema.changePermission);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequestt" });

    throw new Error();
  }

  const token = jbody.token;
  const id = jbody.id;
  const permission: string = jbody.permission;
  const value: number = jbody.value;
  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    // const userVal = JSON.parse(user)as User;

    if (!(await checkPermission(token, "CP"))) {
      await reply.code(403).send({ message: "forbidden" });
      return;
    }
    if (!perms.includes(permission)) {
      await reply.code(400).send({ message: "bad Request" });
      return;
    }
    const [val] = await DB.conn.execute<MySQLRowDataPacket[]>(
      `select *
       from user
       where id = ?`,
      [id]
    );
    if (val.length == 0) {
      await reply.code(404).send({ message: "not found user" });
      return;
    }
    await DB.conn.execute<MySQLRowDataPacket[]>(
      `update user
       SET ${permission} = ?
       where id = ?`,
      [value, id]
    );
    await reply.code(200).send({
      user: id,
      permission: permission,
      value: value
    });
    return;
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);

    throw new Error();
  }
}

async function changeReadWritePermission(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  const perms: string[] = [];
  perms.push("read", "write", "both", "none");
  let jbody: changeReadWritePermissionType;
  try {
    jbody = request.body as changeReadWritePermissionType;
     validate<changeReadWritePermissionType>(jbody,schema.changeReadPermission);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequestt" });

    throw new Error();
  }

  const token = jbody.token;
  const userId = jbody.userId;
  const tableId: number = jbody.tableId;
  const value: string = jbody.value;
  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    // const userVal = JSON.parse(user)as User;

    if (!(await checkPermission(token, "changeReadAccess"))) {
      await reply.code(403).send({ message: "forbidden" });
      return;
    }
    console.log(await checkPermission(token, "changeReadAccess"));
    if (!perms.includes(value)) {
      await reply.code(400).send({ message: "bad Request" });
      return;
    }
    const [findUser] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select *
       from user
       where id = ?`,
      [userId]
    );
    if (findUser.length == 0) {
      await reply.code(404).send({ message: "not found user" });
      return;
    }
    const [findTable] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select *
       from all_tables
       where table_id = ?`,
      [tableId]
    );
    if (findTable.length == 0) {
      await reply.code(404).send({ message: "not found table" });
      return;
    }
    await changeReadAccessFunc(tableId, userId, value);
    await reply.code(200).send({
      user: userId,
      permission: value
    });
    return;
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);

    throw new Error();
  }
}

async function changePassword(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: changePasswordType;
  try {
    jbody = request.body as changePasswordType;
     validate<changePasswordType>(jbody,schema.changePassword);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequestt" });

    throw new Error();
  }

  const token = jbody.token;
  const oldPass: string = jbody.oldPass;
  const newPass: string = jbody.newPass;

  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    const userVal = JSON.parse(user) as User;
    const [RawValue] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select *
       from user
       where id = ?`,
      [userVal.id]
    );
    const value = RawValue as User[];
    const auth: boolean = await bcrypt.compare(oldPass, value[0].password);
    if (auth) {
      await DB.conn.execute<MySQLRowDataPacket[]>(
        `update user
         SET password = ?
         where id = ?`,
        [await bcrypt.hash(newPass, 12), userVal.id]
      );
      await reply.code(200).send({ message: "updated" });
      return;
    } else {
      await reply.code(403).send({ message: "old password is wrong" });
      return;
    }
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);

    throw new Error();
  }
}
//schema
async function setWriteAccess(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: SetWriteAccess;
  try {
    jbody = request.body as SetWriteAccess;
     //validate<SetWriteAccess>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequestt" });

    throw new Error();
  }

  const token: string = jbody.token;
  const users: Vahed[] = jbody.users;
  const tableId: string = jbody.table;

  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    // const userVal = JSON.parse(user) as User;
    if (!(await checkPermission(token, "changeReadAccess"))) {
      await reply.code(403).send({ message: "forbidden" });
      return;
    }
    const permission = "write";
    for (let i = 0; i <= users.length; i++) {
      await DB.conn.query<MySQLRowDataPacket[]>(
        `insert into access_permissions (table_id, user_id, permission)
         VALUES (?, ?, ?)`,
        [tableId, users[i].id, permission]
      );
    }
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);

    throw new Error();
  }
}

//schema todo mostafa
async function retrieveTableData(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: TableRecall;
  try {
    jbody = request.body as  TableRecall;
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequestt" });
    throw new Error();
  }

  const token = jbody.token;
  const tableID: string = jbody.tableID;

  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    const user_val = JSON.parse(user) as User;
    if (!await checkExcelReadAccess(user_val.id, Number(tableID), "read")) {
      await reply.code(403).send({ message: "forbidden" });
      return;
    }

    const check = (await checkExcelReadAccess(user_val.id, parseInt(tableID),"read")) || (await checkExcelReadAccess(user_val.id, parseInt(tableID),"both"));
    if (!check)
    {
      await reply.code(403).send({ message: "You do not have the permission to read this table." });
      return;
    }

    // Extract filters
    // I changed this section 
    const filters: filter[] = jbody.filters?.map(([columnName, contain]) => ({ columnName, contain })) ?? [];

    // Pass filters to the tableDataOutput function if needed
    await tableDataOutput(tableID, filters, reply, jbody.pageNumber, jbody.pageSize);

    return;
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }
}


export function PanelAPI(fastifier: fastify.FastifyInstance, prefix?: string): void {
  fastifier.post(`${prefix ?? ""}/newtable`, cTable);
  fastifier.post(`${prefix ?? ""}/updatetable`, uTable);
  fastifier.post(`${prefix ?? ""}/getDatatable`, rTable);
  fastifier.post(`${prefix ?? ""}/addColumn`, reusetable);
  fastifier.post(`${prefix ?? ""}/showData`, retrieveTableData);
  fastifier.post(`${prefix ?? ""}/approvetable`, approve);
  fastifier.post(`${prefix ?? ""}/search`, search);
  fastifier.post(`${prefix ?? ""}/changePermission`, changePermission);
  fastifier.post(`${prefix ?? ""}/changeReadWritePermission`, changeReadWritePermission);
  fastifier.post(`${prefix ?? ""}/changepassword`, changePassword);
  fastifier.post(`${prefix ?? ""}/setwriteaccess`, setWriteAccess);

}