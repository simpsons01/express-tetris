import env from "./env";
import http from "http";
import cors from "cors";
import express from "express";
import bodyParser from "body-parser";
import rootRouter from "./routes/root";
import gameRouter from "./routes/game";
import gameSocket from "./services/socket/game/index";
import sessionMiddleware from "./util/session";

const app = express();
const httpServer = http.createServer(app);

// initialize
app.use(
  cors({
    origin: env.ALLOW_ORIGIN,
    credentials: true,
  })
);
app.use(sessionMiddleware);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
gameSocket.initialize(httpServer, {
  cors: {
    origin: env.ALLOW_ORIGIN,
    credentials: true,
  },
});

// router
app.use("/health-check", (req, res) => res.status(200));
app.use("/", rootRouter);
app.use("/game", gameRouter);

// start
const port = env.PORT || 3030;
httpServer.listen(port, () => {
  console.log(`Server is running at https://localhost:${port}`);
});
