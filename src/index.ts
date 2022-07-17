import env from "./env";
import { createServer } from "http";
import cors from "cors";
import express, { Express } from "express";
import rootRouter from "./routes/root";
import gameRouter from "./routes/game";
import { TetrisGameSocketService } from "./services/";

const app: Express = express();
const httpServer = createServer(app);
// global middleware
app.use(
  cors({
    origin: env.ALLOW_ORIGIN,
  })
);
// router
app.use("/health-check", (req, res) => {
  res.send("it is healthy");
});
app.use("/", rootRouter);
app.use("/game", gameRouter);
// socket
const tetrisGameSocket = new TetrisGameSocketService(httpServer, {
  cors: {
    origin: env.ALLOW_ORIGIN,
  },
});
tetrisGameSocket.listen();

const port = process.env.PORT || 3030;
httpServer.listen(port, () => {
  console.log(`Server is running at https://localhost:${port}`);
});
