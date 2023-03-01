import env from "./env";
import { createClient } from "redis";
import logger from "./logger";

const redisClient = createClient({
  url: `redis://${env.REDIS_HOST_URL}:${env.REDIS_HOST_PORT}`,
});

redisClient.on("error", (err) => logger.error(err));

export default redisClient;
