import http from "http";
import cors from "cors";
import express from "express";
import bodyParser from "body-parser";
import gameSocket from "./config/socket";
import env from "./config/env";
import { isDev } from "./utils/index";

const run = async () => {
  try {
    const app = express();
    const httpServer = http.createServer(app);
    if (!isDev()) app.set("trust proxy", true);
    app.use(cors({ origin: env.ALLOW_ORIGIN }));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    const gameSocketInstance = gameSocket.initialize(httpServer, {
      path: "/connect/socket.io",
      cors: {
        origin: env.ALLOW_ORIGIN,
      },
    });
    gameSocketInstance.listen();
    app.get("/connect/health-check", (req, res) => res.status(200).end());
    const port = env.PORT || 3030;
    httpServer.listen(port, () =>
      console.log(`Server is running at http://localhost:${port}`)
    );
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

run();
