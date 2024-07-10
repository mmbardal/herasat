import fastify from "fastify";

import { RedisDB } from "@/redis_db";
import { DB } from "@/db";
import { mysqlHost, mysqlPass, mysqlUser } from "@/constants";
import { PanelAPI } from "@/apis/v1/panel";
import { LoginAPI } from "@/apis/v1/login";
import { RegisterAPI } from "@/apis/v1/register";
import { ExcelFileAPI } from "@/excel_upload";
import { GetListAPI } from "@/apis/v1/getlist";
import { GetListBranchAPI } from "@/apis/v1/vahed";
import fastifyMultipart from "@fastify/multipart";

const fastifier = fastify();

try {
  await RedisDB.init();
} catch (e: unknown) {
  //logError(e);
  console.log("DB Error1");

  process.exit(1);
}

try {
  DB.init(10);
  await DB.conn.query("SELECT 1;");
} catch (e) {
  console.log("DB Error");
  console.log(`Connection: ${mysqlHost}:3306`);

  console.log(`Username: ${mysqlUser}`);
  console.log(`Username: ${mysqlPass}`);
  console.log(`Exception: ${e}`);
  console.log("------------------------------------------------");
  process.exit(1);
}

await fastifier.register(fastifyMultipart);

LoginAPI(fastifier, "/v1");
PanelAPI(fastifier, "/v1");
RegisterAPI(fastifier, "/v1");
GetListAPI(fastifier, "/v1");
GetListBranchAPI(fastifier, "/v1");
ExcelFileAPI(fastifier, "/v1");

await fastifier.listen({ port: 3000 });

console.log(`Server started on port 3000`);
