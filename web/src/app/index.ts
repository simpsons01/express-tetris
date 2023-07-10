import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import express from "express";
import bodyParser from "body-parser";
import env from "../config/env";
import errorMiddleware from "../middlewares/error";
import HTTP_STATUS_CODES from "../common/httpStatusCode";
import roomRoute from "../routes/room";
import playerRoute from "../routes/player";
import morgon from "morgan";
import logger from "../config/logger";
import { createResponseError } from "../common/error";
import { isDev } from "../common/utils";

const app = express();
app.disable('x-powered-by')
app.set("trust proxy", true);
if (isDev()) {
  app.use(
    cors({
      origin: env.ALLOW_ORIGIN,
      allowedHeaders: ["Authorization", "Content-Type"],
    })
  );
}

app.use(
  morgon("common", {
    stream: {
      write(message) {
        logger.info(message.trim());
      },
    },
  })
);
app.use(bodyParser.json());

app.get("/health-check", (req, res) => res.status(200).end());
app.use("/room", roomRoute);
app.use("/player", playerRoute);
app.use((req: Request, res: Response, next: NextFunction) =>
  next(createResponseError(HTTP_STATUS_CODES.NOT_FOUND))
);
app.use(errorMiddleware);

export default app;
