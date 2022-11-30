import env from "./env";
import { createClient } from "redis";

let isConnected = false;

const redisClient = createClient({
  url: `redis://${env.REDIS_HOST_URL}:${env.REDIS_HOST_PORT}`,
});

redisClient.on("error", (err) => {
  // should log err
  isConnected = false;
});

export const connect = async () => {
  try {
    await redisClient.connect();
    isConnected = true;
  } catch (err) {
    // should log err
  }
};

export const getRedisClient = () => redisClient;

export const getIsRedisConnect = () => isConnected;
