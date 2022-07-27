import env from "../../env";
import * as Redis from "redis";

const redisClient = Redis.createClient({
  legacyMode: true,
  url: `redis://${env.REDIS_HOST_URL}:${env.REDIS_HOST_PORT}`,
});

export default {
  // TODO: 先偷懶，躲過ts檢查
  getRedisClient: (): typeof redisClient => redisClient,
  async connect(): Promise<void> {
    await redisClient.connect();
  },
};
