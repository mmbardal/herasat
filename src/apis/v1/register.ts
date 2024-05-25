import * as fastify from "fastify";
import { registerType, schema } from "../../schema/panel";
import * as bcrypt from "bcrypt";
import { validate } from "../../utils";

import { DB } from "../../db";

import { MySQLRowDataPacket } from "@fastify/mysql";

import { logError } from "../../logger";
import { RedisDB } from "../../redis_db";
import { checkPermission, validateToken } from "../../check";



async function registerDeputy(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let jbody: registerType;
  try {
    jbody = JSON.parse(request.body as string) as registerType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: any) {
    reply.code(400).send({ message: "badrequestt" });
    console.log(e.message);
    throw new Error();
  }

  const usernames = jbody.username;
  const password = jbody.password;
  const token = jbody.token;
  const deputy = jbody.deputyName;

  try {
    const user = await validateToken(token)
    if (user === null) {
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);
    if (userVal.role != "boss") {
      reply.code(403).send({ message: "forbidden" });
      return;
    }
    if (!(await checkPermission(token, "AU"))) {
      reply.code(403).send({ message: "forbidden" });
      return;
    }
    const [value] = await DB.conn.execute<MySQLRowDataPacket[]>("select deputy from user where deputy=?", [deputy]);
    // console.log(1111);
    // console.log(usernames);
    if (value.length == 0) {
      const passwordDatabase = await bcrypt.hash(password, 12);
      await DB.conn.query(`insert into user (username, password, role, AU, parent_id, deputy)
                           values (?, ?, "deputy", 1, ?, ?)`,[usernames,passwordDatabase,userVal.id,deputy]);
      reply.code(201).send({ message: `${deputy} created` });
      return;
    }
    reply.code(406).send({ message: "a deputy with this name is exist" });
    return;
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}

async function registerManager(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let jbody: registerType;
  try {
    jbody = JSON.parse(request.body as string) as registerType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    reply.code(400).send({ message: "badrequest" });
    throw new Error();
  }

  const usernames = jbody.username;
  const password = jbody.password;
  const token = jbody.token;
  const management = jbody.managementName;

  try {
    const user =await validateToken(token);
    if (user === null) {
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);
    if (userVal.role != "deputy") {
      reply.code(403).send({ message: "forbidden" });
      return;
    }

    if (!(await checkPermission(token, "AU"))) {
      reply.code(403).send({ message: "forbidden" });
      return;
    }

    const [value] = await DB.conn.query<MySQLRowDataPacket[]>(`select * from user where deputy=? and management=?`, [
      userVal.deputy,
      management
    ]);
    console.log(userVal.deputy);
    if (value.length == 0) {
      const passwordDatabase = await bcrypt.hash(password, 12);

      await DB.conn.query(`insert into user (username, password, role, AU, parent_id, deputy, management)
                             values (?, ?, 'manager', 1, ?, ?,
                                     ?)`,[usernames,passwordDatabase,userVal.id,userVal.deputy,management]);

      reply.code(201).send({ message: `${management} created` });
      return;
    }
    reply.code(406).send({ message: "a management with this name in this deputy is exist" });
    return;
  } catch (e: any) {
    logError(e);
    reply.code(500);

    throw new Error();
  }
}

async function registerExpert(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  let jbody: registerType;
  try {
    jbody = JSON.parse(request.body as string) as registerType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    reply.code(400).send({ message: "badrequest" });
    throw new Error();
  }

  const usernames = jbody.username;
  const password = jbody.password;
  const token = jbody.token;
  const expert = jbody.expertName;

  try {
    const user = await validateToken(token);
    if (user === null) {
      reply.code(401).send({ message: "not authenticated" });
      return;
    }
    let userVal = JSON.parse(user);
    if (userVal.role != "manager") {
      reply.code(403).send({ message: "forbidden" });
      return;
    }

    if (!(await checkPermission(token, "AU"))) {
      reply.code(403).send({ message: "forbidden" });
      return;
    }

    const [value] = await DB.conn.query<MySQLRowDataPacket[]>(
      "select * from user where deputy=? and management=? and expert = ?",
      [userVal.deputy, userVal.management, expert]
    );

    if (value.length == 0) {
      const passwordDatabase = await bcrypt.hash(password, 12);
      console.log([usernames,passwordDatabase,userVal.id,userVal.deputy,userVal.management]);
      await DB.conn.execute(`insert into user (username, password, role, AU, parent_id, deputy, management, expert,GE)
                             values (?, ?, 'expert', 0, ?, ?,
                                     ?,?,1)`,[usernames,passwordDatabase,userVal.id,userVal.deputy,userVal.management,expert]);

      reply.code(201).send({ message: `${expert} created` });
      return;
    }
    reply.code(406).send({ message: "a expert with this name in this management is exist" });
    return;
  } catch (e: any) {
    logError(e);
    reply.code(500);
    console.log(e.message);
    throw new Error();
  }
}
export  function RegisterAPI (fastifier: fastify.FastifyInstance, prefix?: string):void {
  fastifier.post(`${prefix ?? ''}/registerDeputy`,  registerDeputy);
  fastifier.post(`${prefix ?? ''}/registerManager`,  registerManager);
  fastifier.post(`${prefix ?? ''}/registerExpert`,  registerExpert);
}