import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL as string;

if (!redisUrl) {
  throw new Error("REDIS_URL environment variable is not set");
}

let redis: Redis;

declare global {
  var __redis: Redis | undefined;
}

function getRedisClient() {
  if (!redis) {
    if (process.env.NODE_ENV === "production") {
      redis = new Redis(redisUrl);
    } else {
      if (!global.__redis) {
        global.__redis = new Redis(redisUrl);
      }
      redis = global.__redis;
    }
  }
  return redis;
}

export const connection = getRedisClient();
