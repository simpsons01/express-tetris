import type { SetOptions } from "redis";
import type { IPlayer } from "../common/types";
import redisClient from "../config/redis";

export default {
  get: async (id: string) => {
    return await redisClient.get(`player:${id}`);
  },
  create: async (id: string, player: IPlayer, options?: SetOptions) => {
    await redisClient.set(`player:${id}`, JSON.stringify(player), options);
  },
  delete: async (id: string) => {
    await redisClient.del(`player:${id}`);
  },
};
