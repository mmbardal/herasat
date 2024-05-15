import { createClient, RedisClientType, RedisFunctions, RedisModules, RedisScripts } from "redis";
import { redisDb, redisHost, redisPort } from "./constants";
import assert from "node:assert";

let redis: RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null = null;

function conn() {
  assert(redis != null, "call RedisDB.init first");
  return redis;
}

async function init() {
  if (redis != null) {
    return redis;
  }

  const client = createClient({ url: `redis://${redisHost}:${redisPort}/${redisDb}` }).on("error", (err) => {
    throw new Error(`${err}`);
  });
  redis = await client.connect();
  return redis;
}

async function close(): Promise<void> {
  assert(redis != null, "call RedisDB.init first");
  await redis.disconnect();
}

export const RedisDB = {
  init,
  close,
  conn
};
