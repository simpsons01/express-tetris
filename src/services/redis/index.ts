import env from "../../env";
import { createClient, RedisClient } from "redis";
import { isNil } from "ramda";
import { logger } from "../../util";

let redisClient: RedisClient;

export enum ERROR_CODE {
  CONNECT_DROP = "NR_CLOSED",
  COMMAND_REJECT = "UNCERTAIN_STATE",
  CONNECT_BROKEN = "CONNECTION_BROKEN",
}

export const getRedisClient = (): RedisClient => {
  if (isNil(redisClient)) {
    redisClient = createClient({
      url: `redis://${env.REDIS_HOST_URL}:${env.REDIS_HOST_PORT}`,
    });
  }
  return redisClient;
};

export const handleRedisError = (err: Error): void => {
  logger.error(err);
};
