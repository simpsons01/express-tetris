import { isDev } from "./util/index";
import env from "./env";
import http from "http";
import cors from "cors";
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
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
app.use(
  session({
    secret: env.SESSION_SECRET as string,
    cookie: {
      secure: !isDev(),
    },
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// router
app.use("/health-check", (req, res) => res.status(200));
app.use("/", rootRouter);
app.use("/game", gameRouter);

// start
const port = env.PORT || 3030;
gameSocket.initialize(httpServer, {
  cors: {
    origin: env.ALLOW_ORIGIN,
  },
});
httpServer.listen(port, () => {
  console.log(`Server is running at https://localhost:${port}`);
});
