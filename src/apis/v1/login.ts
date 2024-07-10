import type * as fastify from "fastify";
//import fastifies from "fastify";
//import { IncomingMessage, ServerResponse } from 'http';
//import { Http2ServerResponse } from "http2";
import type { loginType} from "@/schema/panel";
import { schema } from "@/schema/panel";
//import { schema } from "../../schema/panel";
//import { send } from "process";
//import { validate } from "../../utils";

import * as bcrypt from "bcrypt";
import { DB } from "@/db";

import type { MySQLRowDataPacket } from "@fastify/mysql";

import { randomUUID } from "node:crypto";
import { logError } from "@/logger";
import { RedisDB } from "@/redis_db";
import { validate } from "@/utils";
//import { checkPermission } from "../../check";



export interface User{
  id:number;
  username:string;
  password:string;
  first_name:string;
  last_name:string;
  active : number ;
  parent_id:number;
  SU:number;
  ST:number;
  AU:number;
  changeReadAccess:number;
  CP:number;
  GE:number;
  deputy:string;
  management:string;
  expert:string;
  branch:string;
  province:string
  role:string;
}
interface BranchUser{
  id:number;
  username:string;
  password:string;
  branch:string;
  province:string;
  role:string;
}

async function login(request: fastify.FastifyRequest, reply: fastify.FastifyReply):Promise<void> {
  let jbody: loginType;
  try {
    jbody = request.body as loginType;
    validate<loginType>(jbody,schema.loginValidate);
    console.log(jbody);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequest" });
    throw new Error();
  }

  const usernames = jbody.username;
  const password = jbody.password;



  const [RawValue] = await DB.conn.execute<MySQLRowDataPacket[]>("select * from user where username=?", [usernames]);
  const value = RawValue as User[];
  if (value.length == 0) {
    await reply.code(401).send({ message: "username or password is wrong" });
    return;
  }

  const compare: boolean = await bcrypt.compare(password, value[0].password);
  if (!compare) {
    await reply.code(401).send({ message: "username or password is wrong" });
    return;
  }

  try{
    const keys: string[] = await RedisDB.conn().sendCommand(["keys", `${usernames}*`]);
    if (keys.length > 0) {
      for (let i: number = 0; i <= keys.length - 1; i++) {
        await RedisDB.conn().del(keys[i]);
      }
    }
  } catch (e: unknown) {
    logError(e);
    await reply.code(500).send({ message: "rediserror" });
    throw new Error();
  }

  try {
    const token = usernames + randomUUID().toString();
    await RedisDB.conn().set(token, JSON.stringify(value[0]));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    delete value[0].password;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    delete value[0].id;
    await reply.code(200).send({ token: token, user: value[0] });
  } catch (e: unknown) {
    logError(e);
    await reply.code(500).send({ message: "rediserror" });
    throw new Error();
  }
}
async function loginBranch(request: fastify.FastifyRequest, reply: fastify.FastifyReply):Promise<void> {
  let jbody: loginType;
  try {
    jbody = request.body as loginType;
    validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequest" });
    throw new Error();
  }

  const usernames = jbody.username;
  const password = jbody.password;



  const [RawValue] = await DB.conn.execute<MySQLRowDataPacket[]>("select * from branch_user where username=?", [usernames]);
  const value = RawValue as BranchUser[];
  if (value.length == 0) {
    await reply.code(401).send({ message: "username or password is wrong" });
    return;
  }

  const compare: boolean = await bcrypt.compare(password, value[0].password);
  if (!compare) {
    await reply.code(401).send({ message: "username or password is wrong" });
    return;
  }

  try{
    const keys: string[] = await RedisDB.conn().sendCommand(["keys", `${usernames}*`]);
    if (keys.length > 0) {
      for (let i = 0; i <= keys.length - 1; i++) {
        await RedisDB.conn().del(keys[i]);
      }
    }
  } catch (e: unknown) {
    logError(e);
    await reply.code(500).send({ message: "rediserror" });
    throw new Error();
  }

  try {
    const token = usernames + randomUUID().toString();
    await RedisDB.conn().set(token, JSON.stringify(value[0]));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    delete value[0].password;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    delete value[0].id;
    await reply.code(200).send({ token: token, user: value[0] });
  } catch (e: unknown) {
    logError(e);
    await reply.code(500).send({ message: "redis error" });
    throw new Error();
  }
}
export function LoginAPI (fastifier: fastify.FastifyInstance, prefix?: string):void {
  fastifier.post(`${prefix ?? ''}/login`, login);
  fastifier.post(`${prefix ?? ''}/loginbranch`, loginBranch);
}
