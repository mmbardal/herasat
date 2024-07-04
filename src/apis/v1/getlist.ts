import type * as fastify from "fastify";
import type { GetEmpType, GetManagerType, GetTableType, GetType, GetUserType } from "@/schema/panel";
import { DB } from "@/db";
import type { MySQLRowDataPacket } from "@fastify/mysql";
import { logError } from "@/logger";
import { checkPermission, validateToken } from "@/check";
import type { getWriteAccess } from "@/schema/vahed";
import type { User } from "./login";

export interface userInterface {
  id: number;
  first_name: string;
  last_name: string;
  active: number;
  username: string;
  password: string;
  role: string;
  parent_id: number;
  SU: number;
  ST: number;
  AU: number;
  changeReadAccess: number;
  CP: number;
  GE: number;
  deputy: string;
  management: string;
  expert: number;
  branch: string;
  province: string;
}

interface Prov {
  province: User;
  branches: User[];
}

async function getDeputy(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: GetType;
  try {
    jbody = JSON.parse(request.body as string) as GetType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequest" });
    logError(e);
    throw new Error();
  }

  const token = jbody.token;

  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }

    const [value] = await DB.conn.execute<MySQLRowDataPacket[]>(`select id, deputy
                                                                 from user
                                                                 where role = 'deputy' `);
    await reply.code(200).send({ deputies: value });
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }
}

async function getManagement(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: GetManagerType;
  try {
    jbody = request.body as GetManagerType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequest" });
    logError(e);
    throw new Error();
  }

  const token = jbody.token;
  const deputy = jbody.deputy;

  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    // let userVal = JSON.parse(user) as user;

    const [value] = await DB.conn.execute<MySQLRowDataPacket[]>(
      `select id, management
       from user
       where deputy = ?
         and role = 'manager'`,
      [deputy]
    );
    await reply.code(200).send({ managements: value });
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }
}

async function emp(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: GetEmpType;
  try {
    jbody = request.body as GetEmpType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequest" });
    logError(e);
    throw new Error();
  }

  const token = jbody.token;
  const deputy = jbody.deputy;
  const management = jbody.manager;
  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    const [value] = await DB.conn.execute<MySQLRowDataPacket[]>(
      `select id, expert
       from user
       where deputy = ?
         and management = ? `,
      [deputy, management]
    );
    await reply.code(200).send({ experts: value });
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }
}

async function getUser(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: GetUserType;
  try {
    jbody = request.body as GetUserType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequest" });
    logError(e);
    throw new Error();
  }

  const token = jbody.token;
  const username = jbody.username;
  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    if (await checkPermission(token, "CP")) {
      const [value] = await DB.conn.execute<MySQLRowDataPacket[]>(
        `select id,
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
         where username = ?`,
        [username]
      );
      await reply.code(200).send({ user: value[0] });
      return;
    } else {
      await reply.code(403).send({ message: "forbidden" });
      return;
    }
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }
}

async function table(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: GetTableType;
  try {
    jbody = request.body as GetTableType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequest" });
    logError(e);
    throw new Error();
  }

  const token = jbody.token;

  const pageNum = jbody.offset - 1;
  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    const user_val = JSON.parse(user) as User;
    const role = user_val.role;
    const id = user_val.id;

    console.log(role);
    if (role === "boss") {
      const [allData] = await DB.conn.query<MySQLRowDataPacket[]>(
        `select count(*)
         from all_tables`
      );
      console.log(allData);

      const [value] = await DB.conn.query<MySQLRowDataPacket[]>(
        `select *
         from all_tables
         order by table_id desc
         limit 100 offset ?`,
        [pageNum * 100]
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      await reply.code(200).send({ tables: value, "number of all data": allData[0]["count(*)"] });
    } else if (role === "deputy") {
      const [allData] = await DB.conn.query<MySQLRowDataPacket[]>(
        `select count(*)
         from all_tables
         where deputy_id = ?`,
        [id]
      );
      const [value] = await DB.conn.query<MySQLRowDataPacket[]>(
        `select *
         from all_tables
         where deputy_id = ?
         order by table_id desc
         limit 100 offset ?`,
        [id, pageNum * 100]
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      await reply.code(200).send({ tables: value, "number of all data": allData[0]["count(*)"] });
    } else if (role === "manager") {
      const [allData] = await DB.conn.query<MySQLRowDataPacket[]>(
        `select count(*)
         from all_tables
         where manager_id = ?`,
        [id]
      );
      const [value] = await DB.conn.query<MySQLRowDataPacket[]>(
        `select *
         from all_tables
         where manager_id = ?
         order by table_id desc
         limit 100 offset ?`,
        [id, pageNum * 100]
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      await reply.code(200).send({ tables: value, "number of all data": allData[0]["count(*)"] });
    } else if (role === "expert") {
      const [allData] = await DB.conn.query<MySQLRowDataPacket[]>(
        `select count(*)
         from all_tables
         where emp_id = ?`,
        [id]
      );
      const [value] = await DB.conn.query<MySQLRowDataPacket[]>(
        `select *
         from all_tables
         where emp_id = ?
         order by table_id desc
         limit 100 offset ?`,
        [id, pageNum * 100]
      );
      await reply.code(200).send({
        "tables": value,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        "number of all data": allData[0]["count(*)"]
      });
    }

    return;
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }
}

async function getProv(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: GetType;
  try {
    jbody = request.body as GetType;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequest" });
    logError(e);
    throw new Error();
  }

  const token = jbody.token;

  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const [value] = (await DB.conn.query<MySQLRowDataPacket[]>(
      `select  id,province
       from user
       where province is not null and branch is null`
    )) as unknown as User;
    const listProv: Prov[] = [];
    for (const item of value) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const prov: Prov = { province: item, branches: [] };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment

      listProv.push(prov);
    }
    for (const item of listProv) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const [subUser] = (await DB.conn.query<MySQLRowDataPacket[]>(
        `select id, branch
         from user
         where province = ${item.province.province} and branch is not null`
      )) as unknown as userInterface;
      for (const item1 of subUser) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
        item.branches.push(item1.branch);
      }
    }
    await reply.code(200).send({ provinces: listProv });
    return;
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }
}

async function vahedTablePermission(request: fastify.FastifyRequest, reply: fastify.FastifyReply): Promise<void> {
  let jbody: getWriteAccess;
  try {
    jbody = request.body as getWriteAccess;
    // validate<loginType>(jbody,schema.loginValidate);
  } catch (e: unknown) {
    await reply.code(400).send({ message: "badrequest" });
    logError(e);
    throw new Error();
  }

  const token = jbody.token;
  const tableId = jbody.tableId;
  try {
    const user = await validateToken(token);
    if (user === null) {
      await reply.code(401).send({ message: "not authenticated" });
      return;
    }
    if (!(await checkPermission(token, "changeReadAccess"))) {
      await reply.code(403).send({ message: "forbidden" });
      return;
    }

    const [value] = await DB.conn.execute<MySQLRowDataPacket[]>(
      `select user.id, access_permissions.permission
       from user
                left join access_permissions on user.id = access_permissions.user_id and access_permissions.table_id = ?

      `,
      [tableId]
    );
    await reply.code(200).send({ users: value });
  } catch (e: unknown) {
    logError(e);
    await reply.code(500);
    throw new Error();
  }
}

export function GetListAPI(fastifier: fastify.FastifyInstance, prefix?: string): void {
  fastifier.post(`${prefix ?? ""}/getemp`, emp);
  fastifier.post(`${prefix ?? ""}/getdeputy`, getDeputy);
  fastifier.post(`${prefix ?? ""}/getmanagement`, getManagement);
  fastifier.post(`${prefix ?? ""}/getuser`, getUser);
  fastifier.post(`${prefix ?? ""}/gettable`, table);
  fastifier.post(`${prefix ?? ""}/getprov`, getProv);
  fastifier.post(`${prefix ?? ""}/getvahedTablePermission`, vahedTablePermission);
}
