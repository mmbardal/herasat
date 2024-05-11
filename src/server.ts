import fastify from "fastify";
import { RedisDB } from "./redis_db";
import { DB } from "./db";
import { mysqlHost, mysqlPass, mysqlUser } from "./constatnts";


(async () => {
  const fastifier = fastify();

  try {
    await RedisDB.init();
  } catch (e: any) {
    //logError(e);
    console.log("DB Error1");
    process.exit(1);
  }

  try {
    DB.init(10);
    const resault = await DB.conn.query("SELECT 1;");
    console.log(resault);
  } catch (e) {
    console.log("DB Error");
    console.log(`Connection: ${mysqlHost}:3306`);

    console.log(`Username: ${mysqlUser}`);
    console.log(`Username: ${mysqlPass}`);
    console.log(`Exception: ${e}`);
    console.log("------------------------------------------------");
    process.exit(1);
  }

  fastifier.register(require("./apis/v1/login"), { prefix: "/v1" });
  fastifier.register(require("./apis/v1/register"), { prefix: "/v1" });

  await fastifier.listen({ port: 3000 });

  console.log(`Server started on port ${3000}`);
})();
