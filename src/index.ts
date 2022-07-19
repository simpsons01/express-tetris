import env from "./env";
import http from "http";
import cors from "cors";
import express from "express";
import rootRouter from "./routes/root";
import gameRouter from "./routes/game";
import gameSocket from "./services/socket/game";

const app = express();
const httpServer = http.createServer(app);
// initialize
app.use(
  cors({
    origin: env.ALLOW_ORIGIN,
  })
);
gameSocket.initialize(httpServer, {
  cors: {
    origin: env.ALLOW_ORIGIN,
  },
});
// router
app.use("/health-check", (req, res) => res.send("it is healthy"));
app.use("/", rootRouter);
app.use("/game", gameRouter);

const port = process.env.PORT || 3030;
httpServer.listen(port, () => {
  console.log(`Server is running at https://localhost:${port}`);
});
