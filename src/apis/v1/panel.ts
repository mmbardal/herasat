import * as fastify from "fastify";
import { ApproveType, comboRegexGenerator, editTable, fields, GetType, newTable, Types } from "../../schema/panel";

import { DB } from "../../db";

import { MySQLRowDataPacket } from "@fastify/mysql";
import { logError } from "../../logger";
import { checkPermission, validateToken } from "../../check";
import { dateRegex, homeNumberRegex, nationalCodeRegex, numbers, phoneNumberRegex } from "../../constatnts";

module.exports = async function (fastifier: fastify.FastifyInstance, done: fastify.HookHandlerDoneFunction) {
  fastifier.post("/newtable", await cTable);
  fastifier.post("/updatetable", await uTable);
  //fastifier.post("deletetable");
  fastifier.post("/gettable", await rTable);
  fastifier.post("/approvetable", await approve);
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
      console.log(jbody.fields[i])
    }
    const dataField: fields[] = jbody.fields;
    console.log(typeof expertID);
    await DB.conn.query(
      `insert into all_tables (table_name_FA, change_lock, emp_id, manager_id, deputy_id, boss_id, approval_level,
                               write_permission, dead_line, columns_properties)
       values (?, 1, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [jbody.tableName, expertID, managerID, deputyID, bossID, new Date(jbody.deadline),JSON.stringify( jbody.fields)]
    );
    reply.code(201).send({ message: `${jbody.tableName} defined` });
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
    }
    const [step] = await DB.conn.query<MySQLRowDataPacket[]>(
      `select approval_level
       from all_tables
       where emp_id = ?
         and table_id = ?`,
      [userVal.id, tableID]
    );
    if (step[0]["approval_level"] != 0)
      reply.code(403).send({ message: `you can't changed table in step ${step[0]["approval_level"]}` });

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
      console.log(jbody.fields[i])
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
       where emp_id = ?`,
      [userVal.id]
    );
    reply.code(200).send(tables);
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
    }
    const step = table[0];
    switch (role) {
      case "boss":
        if (step != 3) reply.code(403).send({ message: "forbidden" });
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
        if (step != 2) reply.code(403).send({ message: "forbidden" });
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
        if (step != 1) reply.code(403).send({ message: "forbidden" });
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
        if (step != 0) reply.code(403).send({ message: "forbidden" });
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
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}
