import * as socket from "./socket";
import redisClient from "./config/redis";
import env from "./config/env";
import app from "./app";
import logger from "./config/logger";
import http from "http";
import { isDev } from "./utils/common";

(async () => {
  try {
    await redisClient.connect();
    const httpServer = http.createServer(app);
    socket.initialize(httpServer, {
      ...(isDev()
        ? {
            cors: {
              origin: env.ALLOW_ORIGIN,
            },
          }
        : {}),
    });
    const port = env.PORT;
    const server = httpServer.listen(port, () => {
      logger.info(`Server is running at http://localhost:${port}`);
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
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
})();
