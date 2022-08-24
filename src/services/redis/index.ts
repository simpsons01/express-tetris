import env from "../../env";
import { createClient, RedisClient, RedisError, AbortError } from "redis";
import { isNil } from "ramda";
import { logger } from "../../util";

let redisClient: RedisClient;

export enum ERROR_CODE {
  CONNECT_DROP = "NR_CLOSED",
  COMMAND_REJECT = "UNCERTAIN_STATE",
  CONNECT_BROKEN = "CONNECTION_BROKEN",
}

export const getIsRedisConnectBrokenError = (error: unknown): boolean => {
  return (
    error instanceof RedisError &&
    error instanceof AbortError &&
    (error.code === ERROR_CODE.CONNECT_BROKEN || error.code === ERROR_CODE.CONNECT_DROP)
  );
};

export const handleRedisError = (err: Error): void => {
  logger.error(err);
};

export const getRedisClient = (): RedisClient => {
  if (isNil(redisClient)) {
    redisClient = createClient({
      url: `redis://${env.REDIS_HOST_URL}:${env.REDIS_HOST_PORT}`,
    });
  }
  return redisClient;
};
