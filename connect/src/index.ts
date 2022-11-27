import http from "http";
import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import gameSocket from "./services/socket/game/index";
import env from "./env";
import { isDev } from "./util/index";
import { getRedisClient } from "./services/redis";
import { createAdapter } from "@socket.io/redis-adapter";

class App {
  async run() {
    try {
      const pubClient = getRedisClient();
      const subClient = pubClient.duplicate();

      pubClient.on("error", (error) => {
        console.log(error);
      });
      subClient.on("error", (error) => {
        console.log(error);
      });

      // initialize
      const app = express();
      const httpServer = http.createServer(app);
      if (!isDev()) app.set("trust proxy", true);
      app.use(
        cors({
          origin: env.ALLOW_ORIGIN,
          credentials: true,
        })
      );
      app.use(bodyParser.json());
      app.use(bodyParser.urlencoded({ extended: false }));
      // initialize socket.io
      const gameSocketInstance = gameSocket.initialize(httpServer, {
        cors: {
          origin: env.ALLOW_ORIGIN,
          credentials: true,
        },
      });
      gameSocketInstance.io.adapter(createAdapter(pubClient, subClient));
      gameSocketInstance.listen();
      // router
      app.get("/health-check", (req, res) => res.status(200).end());

      // start app
      const port = env.PORT || 3030;
      httpServer.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
      });
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  }
}

new App().run();
