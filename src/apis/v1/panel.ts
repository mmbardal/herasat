import * as fastify from "fastify";
import {
  ApproveType,
  changePermissionType, changeReadWritePermissionType,
  comboRegexGenerator,
  editTable,
  fields,
  GetType,
  newTable,
  searchActionType,
  searchType
} from "../../schema/panel";

import { DB } from "../../db";

import { MySQLRowDataPacket } from "@fastify/mysql";
import { logError } from "../../logger";
import { changeReadAccessFunc, checkPermission, validateToken } from "../../check";
import { dateRegex, homeNumberRegex, nationalCodeRegex, numbers, phoneNumberRegex } from "../../constants";
import * as bcrypt from "bcrypt";

module.exports = async function (fastifier: fastify.FastifyInstance, done: fastify.HookHandlerDoneFunction) {
  fastifier.post("/newtable", await cTable);
  fastifier.post("/updatetable", await uTable);
  //fastifier.post("deletetable");
  fastifier.post("/gettable", await rTable);
  fastifier.post("/approvetable", await approve);
  fastifier.post("/search", await search);
  fastifier.post("/changePermission", await changePermission);
  fastifier.post("/changeReadWritePermission", await changeReadWritePermission);
};

async function cTable(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let jbody: newTable;
  try {
    jbody = JSON.parse(request.body as string) as newTable;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: any) {
    reply.code(400).send({ message: "badrequestt" });
    console.log(e.message);
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
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);
    if (await checkPermission(token, "GE")) {
      reply.code(403).send({ message: "forbidden" });
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
      [managerIDRows[0]["parent_id"]]
    );
    const [bossIDRows] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select parent_id
       from user
       where id = ?`,
      [deputyIDRows[0]["parent_id"]]
    );
    const managerID = managerIDRows[0]["parent_id"];
    const deputyID = deputyIDRows[0]["parent_id"];
    const bossID = bossIDRows[0]["parent_id"];
    console.log(managerID);
    for (let i = 0; i < jbody.fields.length; i++) {
      if (jbody.fields[i].model == "comboBox") {
        const combo = jbody.fields[i].comboBoxValues;
        jbody.fields[i].regex = comboRegexGenerator(combo);
      }
      if (jbody.fields[i].model == "phoneNumber") {
        jbody.fields[i].regex = phoneNumberRegex;
      }
      if (jbody.fields[i].model == "homeNumber") {
        jbody.fields[i].regex = homeNumberRegex;
      }
      if (jbody.fields[i].model == "nationalCode") {
        jbody.fields[i].regex = nationalCodeRegex;
      }
      if (jbody.fields[i].model == "decimal") {
        jbody.fields[i].regex = numbers;
      }
      if (jbody.fields[i].model == "anyThings") {
        jbody.fields[i].regex = "";
      }
      if (jbody.fields[i].model == "date") {
        jbody.fields[i]["regex"] = dateRegex;
      }
      console.log(jbody.fields[i]);
    }
    const dataField: fields[] = jbody.fields;
    console.log(typeof expertID);
    await DB.conn.query(
      `insert into all_tables (table_name_FA, change_lock, emp_id, manager_id, deputy_id, boss_id, approval_level,
                               write_permission, dead_line, columns_properties)
       values (?, 1, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [jbody.tableName, expertID, managerID, deputyID, bossID, new Date(jbody.deadline), JSON.stringify(jbody.fields)]
    );
    reply.code(201).send({ message: `${jbody.tableName} defined` });
    return;
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}

async function uTable(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let jbody: editTable;
  try {
    jbody = JSON.parse(request.body as string) as editTable;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: any) {
    reply.code(400).send({ message: "badrequestt" });
    console.log(e.message);
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
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);
    if (await checkPermission(token, "GE")) {
      reply.code(403).send({ message: "forbidden" });
      return;
    }
    const [step] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select approval_level
       from all_tables
       where emp_id = ?
         and table_id = ?`,
      [userVal.id, tableID]
    );
    if (step[0]["approval_level"] != 0) {
      reply.code(403).send({ message: `you can't changed table in step ${step[0]["approval_level"]}` });
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
      [managerIDRows[0]["parent_id"]]
    );
    const [bossIDRows] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select parent_id
       from user
       where id = ?`,
      [deputyIDRows[0]["parent_id"]]
    );
    const managerID = managerIDRows[0]["parent_id"];
    const deputyID = deputyIDRows[0]["parent_id"];
    const bossID = bossIDRows[0]["parent_id"];
    for (let i = 0; i < jbody.fields.length; i++) {
      if (jbody.fields[i].model == "comboBox") {
        const combo = jbody.fields[i].comboBoxValues;
        jbody.fields[i].regex = comboRegexGenerator(combo);
      }
      if (jbody.fields[i].model == "phoneNumber") {
        jbody.fields[i].regex = phoneNumberRegex;
      }
      if (jbody.fields[i].model == "homeNumber") {
        jbody.fields[i].regex = homeNumberRegex;
      }
      if (jbody.fields[i].model == "nationalCode") {
        jbody.fields[i].regex = nationalCodeRegex;
      }
      if (jbody.fields[i].model == "decimal") {
        jbody.fields[i].regex = numbers;
      }
      if (jbody.fields[i].model == "anyThings") {
        jbody.fields[i].regex = "";
      }
      if (jbody.fields[i].model == "date") {
        jbody.fields[i]["regex"] = dateRegex;
      }
      console.log(jbody.fields[i]);
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
    reply.code(202).send({ message: `${tableName} updated` });
    return;
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}

async function rTable(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let jbody: GetType;
  try {
    jbody = JSON.parse(request.body as string) as GetType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: any) {
    reply.code(400).send({ message: "badrequestt" });
    console.log(e.message);
    throw new Error();
  }

  const token = jbody.token;

  try {
    const user = await validateToken(token);
    if (user === null) {
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);

    const [tables] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select *
       from all_tables
       where emp_id = ? or manager_id = ? or deputy_id = ? or boss_id=?`,
      [userVal.id,userVal.id,userVal.id,userVal.id]
    );
    reply.code(200).send(tables);
    return;
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}

async function approve(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let jbody: ApproveType;
  try {
    jbody = JSON.parse(request.body as string) as ApproveType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: any) {
    reply.code(400).send({ message: "badrequestt" });
    console.log(e.message);
    throw new Error();
  }

  const tableID = jbody.tableID;
  const token = jbody.token;
  const func = jbody.func;
  try {
    const user = await validateToken(token);
    if (user === null) {
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);
    const role = userVal.role;
    let table: string | any[];
    switch (role) {
      case "boss":
        table = await DB.conn.query<MySQLRowDataPacket[]>(
          `select approval_level
           from all_tables
           where boss_id = ?
             and table_id = ?`,
          [userVal.id, tableID]
        );
        break;
      case "deputy":
        table = await DB.conn.query<MySQLRowDataPacket[]>(
          `select approval_level
           from all_tables
           where deputy_id = ?
             and table_id = ?`,
          [userVal.id, tableID]
        );
        break;
      case "manager":
        table = await DB.conn.query<MySQLRowDataPacket[]>(
          `select approval_level
           from all_tables
           where manager_id = ?
             and table_id = ?`,
          [userVal.id, tableID]
        );
        break;
      case "expert":
        table = await DB.conn.query<MySQLRowDataPacket[]>(
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
      reply.code(403).send({ message: "forbidden" });
      return;
    }
    const step = table[0];
    switch (role) {
      case "boss":
        if (step != 3) {
          reply.code(403).send({ message: "forbidden" });
          return;
        }
        if (func == "approve") {
          await DB.conn.query(
            `update all_tables
             set approval_level = 4
             where table_id = ?`,
            [tableID]
          );
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
          reply.code(403).send({ message: "forbidden" });
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
          reply.code(403).send({ message: "forbidden" });
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
          reply.code(403).send({ message: "forbidden" });
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
          reply.code(403);
        }
        break;
    }
    reply.code(202).send({ message: "approval step changed" });
    return;
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}

async function showTablePagination(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {}

async function search(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let jbody: searchType;
  try {
    jbody = JSON.parse(request.body as string) as searchType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: any) {
    reply.code(400).send({ message: "badrequestt" });
    console.log(e.message);
    throw new Error();
  }

  const token = jbody.token;
  const action = jbody.action;
  const name: string = jbody.name;

  try {
    const user = await validateToken(token);
    if (user === null) {
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);
    if (action == searchActionType.userSearch) {
      if (!(await checkPermission(token, "SU"))) {
        reply.code(403).send({ message: "forbidden" });
        return;
      }
      const [value] = await DB.conn.execute<MySQLRowDataPacket[]>(
        "select username,active,expert,management,deputy,role from user where username LIKE  ?",
        [`%${name}%`]
      );
      reply.code(200).send({
        users: value
      });
      return;
    }
    if (action == searchActionType.tableSearch) {
      if (!(await checkPermission(token, "ST"))) {
        reply.code(403).send({ message: "forbidden" });
        return;
      }
      const [value] = await DB.conn.execute<MySQLRowDataPacket[]>(
        "select * from all_tables where all_tables.table_name_FA LIKE  ?",
        [`%${name}%`]
      );
      reply.code(200).send({
        tables: value
      });
      return;
    }
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}

async function changePermission(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let perms: string[]=[];
  perms.push("SU","ST","AU","GE","changeReadAccess")
  let jbody: changePermissionType;
  try {
    jbody = JSON.parse(request.body as string) as changePermissionType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: any) {
    reply.code(400).send({ message: "badrequestt" });
    console.log(e.message);
    throw new Error();
  }

  const token = jbody.token;
  const id = jbody.id;
  const permission: string = jbody.permission;
  const value :number = jbody.value
  try {
    const user = await validateToken(token);
    if (user === null) {
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);

    if (!(await checkPermission(token, "CP"))) {
      reply.code(403).send({ message: "forbidden" });
      return;
    }
    if(!perms.includes(permission)) {
      reply.code(400).send({ message: "bad Request" });
      return;
    }
    const [val] = await DB.conn.execute<MySQLRowDataPacket[]>(
      `select *  from user  where id = ?` ,
      [id]
    );
    if(val.length==0) {
      reply.code(404).send({ message: "not found user" });
      return;
    }
     await DB.conn.execute<MySQLRowDataPacket[]>(
      `update user SET ${permission} = ? where id = ?` ,
      [value,id]
    );
    reply.code(200).send({
      user : id,permission: permission,value:value
    });
    return;
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}

async function changeReadWritePermission(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let perms: string[]=[];
  perms.push("read","write","both","none")
  let jbody: changeReadWritePermissionType;
  try {
    jbody = JSON.parse(request.body as string) as changeReadWritePermissionType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: any) {
    reply.code(400).send({ message: "badrequestt" });
    console.log(e.message);
    throw new Error();
  }

  const token = jbody.token;
  const userId = jbody.userId;
  const tableId: number = jbody.tableId;
  const value :string = jbody.value;
  try {
    const user = await validateToken(token);
    if (user === null) {
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);

    if (!(await checkPermission(token, "changeReadAccess"))) {
      reply.code(403).send({ message: "forbidden" });
      return;
    }
    console.log(await checkPermission(token,"changeReadAccess"))
    if(!perms.includes(value)) {
      reply.code(400).send({ message: "bad Request" });
      return;
    }
    const [findUser] =await  DB.conn.query<MySQLRowDataPacket[]>(`select * from user where id = ?`,[userId]);
    if (findUser.length==0) {
      reply.code(404).send({ message: "not found user" });
      return;
    }
    const [findTable] =await  DB.conn.query<MySQLRowDataPacket[]>(`select * from all_tables where table_id = ?`,[tableId]);
    if (findTable.length==0) {
      reply.code(404).send({ message: "not found table" });
      return;
    }
    await changeReadAccessFunc(tableId,userId,value);
    reply.code(200).send({
      user : userId,permission:value
    });
    return;
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}