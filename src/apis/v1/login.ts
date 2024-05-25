import * as fastify from "fastify";
import fastifies from "fastify";
//import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerResponse } from "http2";
import { schema, loginType } from "../../schema/panel";
import { send } from "process";
import { validate } from "../../utils";

import * as bcrypt from "bcrypt";
import { DB } from "../../db";

import { MySQLRowDataPacket } from "@fastify/mysql";

import { randomUUID } from "node:crypto";
import { logError } from "../../logger";
import { RedisDB } from "../../redis_db";
import { checkPermission } from "../../check";





async function login(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  var jbody: loginType;
  try {
    jbody = JSON.parse(request.body as string) as loginType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    reply.code(400).send({ message: "badrequest" });
    throw new Error();
  }

  const usernames = jbody.username;
  const password = jbody.password;



  const [value] = await DB.conn.execute<MySQLRowDataPacket[]>("select * from user where username=?", [usernames]);
  if (value.length == 0) {
    reply.code(401).send({ message: "username or password is wrong" });
    return;
  }

  let compare: boolean = await bcrypt.compare(password, value[0].password);
  if (!compare) {
    reply.code(401).send({ message: "username or password is wrong" });
    return;
  }

  try{
    const keys: string[] = await RedisDB.conn().sendCommand(["keys", `${usernames}*`]);
    if (keys.length > 0) {
      for (let i: number = 0; i <= keys.length - 1; i++) {
        await RedisDB.conn().del(keys[i]);
      }
    }
  } catch (e: any) {
    logError(e);
    reply.code(500).send({ message: "rediserror" });
    throw new Error();
  }

  try {
    let token = usernames + randomUUID().toString();
    await RedisDB.conn().set(token, JSON.stringify(value[0]));
    // @ts-ignore
    delete value[0].password;
    delete value[0].id;
    reply.code(200).send({ token: token, user: value[0] });
  } catch (e: any) {
    logError(e);
    reply.code(500).send({ message: "rediserror" });
    throw new Error();
  }
}
async function loginbranch(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  var jbody: loginType;
  try {
    jbody = JSON.parse(request.body as string) as loginType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    reply.code(400).send({ message: "badrequest" });
    throw new Error();
  }

  const usernames = jbody.username;
  const password = jbody.password;



  const [value] = await DB.conn.execute<MySQLRowDataPacket[]>("select * from branch_user where username=?", [usernames]);
  if (value.length == 0) {
    reply.code(401).send({ message: "username or password is wrong" });
    return;
  }

  let compare: boolean = await bcrypt.compare(password, value[0].password);
  if (!compare) {
    reply.code(401).send({ message: "username or password is wrong" });
    return;
  }

  try{
    const keys: string[] = await RedisDB.conn().sendCommand(["keys", `${usernames}*`]);
    if (keys.length > 0) {
      for (let i: number = 0; i <= keys.length - 1; i++) {
        await RedisDB.conn().del(keys[i]);
      }
    }
  } catch (e: any) {
    logError(e);
    reply.code(500).send({ message: "rediserror" });
    throw new Error();
  }

  try {
    let token = usernames + randomUUID().toString();
    await RedisDB.conn().set(token, JSON.stringify(value[0]));
    // @ts-ignore
    delete value[0].password;
    delete value[0].id;
    reply.code(200).send({ token: token, user: value[0] });
  } catch (e: any) {
    logError(e);
    reply.code(500).send({ message: "rediserror" });
    throw new Error();
  }
}
export function LoginAPI (fastifier: fastify.FastifyInstance, prefix?: string):void {
  fastifier.post(`${prefix ?? ''}/login`, login);
}
