import * as fastify from "fastify";
import { GetEmpType, GetManagerType, GetTableType, GetType, GetUserType } from "../../schema/panel";

import { DB } from "../../db";

import { MySQLRowDataPacket } from "@fastify/mysql";
import { logError } from "../../logger";
import { checkPermission, validateToken } from "../../check";

module.exports = async function (fastifier: fastify.FastifyInstance, done: fastify.HookHandlerDoneFunction) {
  fastifier.post("/getemp", await emp);
  fastifier.post("/getprov", await prov);
  fastifier.post("/getdeputy", await deputy);
  fastifier.post("/getmanagement", await management);
  fastifier.post("/getbranch", await branch);
  fastifier.post("/getuser", await user);
  fastifier.post("/gettable", await table);
};

async function deputy(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
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

    const [value] = await DB.conn.execute<MySQLRowDataPacket[]>(`select id, deputy
                                                                 from user
                                                                 where role = 'deputy' `);
    reply.code(200).send({ deputies: value });
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}

async function management(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let jbody: GetManagerType;
  try {
    jbody = JSON.parse(request.body as string) as GetManagerType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: any) {
    reply.code(400).send({ message: "badrequestt" });
    console.log(e.message);
    throw new Error();
  }

  const token = jbody.token;
  const deputy = jbody.deputy;

  try {
    const user = await validateToken(token);
    if (user === null) {
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);

    const [value] = await DB.conn.execute<MySQLRowDataPacket[]>(
      `select id, management
       from user
       where deputy = ?
         and role = 'manager'`,
      [deputy]
    );
    reply.code(200).send({ managements: value });
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}

async function emp(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let jbody: GetEmpType;
  try {
    jbody = JSON.parse(request.body as string) as GetEmpType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: any) {
    reply.code(400).send({ message: "badrequestt" });
    console.log(e.message);
    throw new Error();
  }

  const token = jbody.token;
  const deputy = jbody.deputy;
  const management = jbody.manager;
  try {
    const user = await validateToken(token);
    if (user === null) {
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);

    const [value] = await DB.conn.execute<MySQLRowDataPacket[]>(
      `select id, expert
                                                                 from user
                                                                 where deputy = ?
                                                                   and management = ? `,
      [deputy, management]
    );
    reply.code(200).send({ experts: value });
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}

async function user(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let jbody: GetUserType;
  try {
    jbody = JSON.parse(request.body as string) as GetUserType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: any) {
    reply.code(400).send({ message: "badrequestt" });
    console.log(e.message);
    throw new Error();
  }

  const token = jbody.token;
  const username = jbody.username;
  try {
    const user = await validateToken(token);
    if (user === null) {
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);
    if(await checkPermission(token , "CP")){
      const [value] = await DB.conn.execute<MySQLRowDataPacket[]>(`select id,
                                                                          username,
                                                                          role,
                                                                          parent_id,
                                                                          SU,
                                                                          ST,
                                                                          CP,
                                                                          AU,
                                                                          changeReadAccess,
                                                                          GE
                                                                   from user
      `);
      reply.code(200).send({ user: value[0] });
      return;
    }else{
      reply.code(403).send({ message: "forbidden" });
      return;
    }

  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}

async function table(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let jbody: GetTableType;
  try {
    jbody = JSON.parse(request.body as string) as GetTableType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: any) {
    reply.code(400).send({ message: "badrequestt" });
    console.log(e.message);
    throw new Error();
  }

  const token = jbody.token;
  const id = jbody.id;
  try {
    const user = await validateToken(token);
    if (user === null) {
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);

    const [value] =await DB.conn.query<MySQLRowDataPacket[]>(`select * from all_tables where emp_id = ?`,[id]);
    reply.code(200).send({tables:value});
    return;
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}
//todo show table section
// async function prov(request: fastify.FastifyRequest, reply: fastify.FastifyReply){
//
// }
//todo show table section
// async function branch(request: fastify.FastifyRequest, reply: fastify.FastifyReply){
//
// }