import env from "../env";
import { createClient, RedisClient } from "redis";
import { isNil } from "ramda";

let redisClient: RedisClient;

export const getRedisClient = (): RedisClient => {
  if (isNil(redisClient)) {
    redisClient = createClient({
      url: `redis://${env.REDIS_HOST_URL}:${env.REDIS_HOST_PORT}`,
    });
  }
  return redisClient;
};
