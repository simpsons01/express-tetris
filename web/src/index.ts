import * as socket from "./socket";
import redisClient from "./config/redis";
import env from "./config/env";
import app from "./app";
import logger from "./config/logger";
import http from "http";
import { isDev } from "./common/utils";

const start = async () => {
  await redisClient.connect();
  const httpServer = http.createServer(app);
  const port = env.PORT;
  socket.initialize(httpServer, {
    cors: {
      origin: env.ALLOW_ORIGIN,
    },
  });
  const listenConfig = isDev() ? { port } : { port, host: "0.0.0.0" };
  const server = httpServer.listen(listenConfig, () => {
    logger.info(`Server is listening at ${port}`);
  });
  const stop = () => {
    return new Promise((resolve) => {
      redisClient
        .quit()
        .then(() => {
          server.close(resolve);
        })
        .catch((error) => {
          logger.error(error);
          server.close(resolve);
        });
    });
  };
  process.on("unhandledRejection", async (error) => {
    logger.error(error);
    await stop();
    process.exit(1);
  });
  process.on("uncaughtException", async (error) => {
    logger.error(error);
    await stop();
    process.exit(1);
  });
  process.on("SIGTERM", async () => {
    await stop();
  });
};

start();
