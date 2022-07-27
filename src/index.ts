import http from "http";
import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import rootRouter from "./routes/root";
import gameRouter from "./routes/game";
import gameSocket from "./services/socket/game/index";
import session from "express-session";
import env from "./env";
import { isDev, logger } from "./util/index";
import redis from "./services/redis";
import CreateRedisStore from "connect-redis";

class App {
  async run() {
    try {
      // connect to redis
      console.log("connecting to redis");
      const RedisStore = CreateRedisStore(session);
      await redis.connect();
      console.log("connecting to redis successfully!");

      // initialize
      const app = express();
      const httpServer = http.createServer(app);
      const sessionMiddleware = session({
        store: new RedisStore({ client: redis.getRedisClient() }),
        secret: env.SESSION_SECRET as string,
        cookie: {
          secure: !isDev(),
        },
      });

      // setup global middleware
      app.use(
        cors({
          origin: env.ALLOW_ORIGIN,
          credentials: true,
        })
      );
      app.use(sessionMiddleware);
      app.use(bodyParser.json());
      app.use(bodyParser.urlencoded({ extended: false }));

      // initialize socket.io
      const gameSocketInstance = gameSocket.initialize(httpServer, {
        cors: {
          origin: env.ALLOW_ORIGIN,
          credentials: true,
        },
      });
      gameSocketInstance.io.use((socket, next) => {
        sessionMiddleware(socket.request as Request, {} as Response, next as NextFunction);
      });
      gameSocketInstance.listen();
      // @ts-ignore
      global.gameSocketInstance = gameSocketInstance;

      // router
      app.use("/health-check", (req, res) => res.status(200));
      app.use("/", rootRouter);
      app.use("/game", gameRouter);

      // start app
      const port = env.PORT || 3030;
      httpServer.listen(port, () => {
        console.log(`Server is running at https://localhost:${port}`);
      });
    } catch (error) {
      logger.error(error);
      process.exit(1);
    }
  }
}

new App().run();
