import type { IRoom } from "../common/types";
import redisClient from "../config/redis";

export default {
  get: async (id: string) => {
    return await redisClient.get(`room:${id}`);
  },
  create: async (id: string, room: IRoom) => {
    await redisClient.set(`room:${id}`, JSON.stringify(room));
  },
  update: async (id: string, room: IRoom) => {
    await redisClient.set(`room:${id}`, JSON.stringify(room));
  },
  delete: async (id: string) => {
    await redisClient.del(`room:${id}`);
  },
  getIds: async () => {
    return await redisClient.sMembers("rooms");
  },
  createId: async (id: string) => {
    await redisClient.sAdd("rooms", id);
  },
  deleteId: async (id: string) => {
    await redisClient.sRem("rooms", id);
  },
};
