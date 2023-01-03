import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import env from "../config/env";
import { isDev } from "../utils/index";
import errorMiddleware from "../middlewares/error";
import { createErrorResponse } from "../utils/error";
import { HTTP_STATUS_CODES } from "../utils/httpStatus";
import passport from "passport";
import JwtStrategy from "../config/passport/JwtStrategy";
import roomRoute from "../routes/room";
import playerRoute from "../routes/player";

const app = express();
if (!isDev()) app.set("trust proxy", true);
app.use(
  cors({
    origin: env.ALLOW_ORIGIN,
    allowedHeaders: ["Authorization", "Content-Type"],
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
passport.use(JwtStrategy);

app.get("/health-check", (req, res) => res.status(200).end());
app.use("/room", roomRoute);
app.use("/player", playerRoute);
app.use((req: Request, res: Response, next: NextFunction) =>
  next(createErrorResponse(HTTP_STATUS_CODES.NOT_FOUND))
);
app.use(errorMiddleware);

export default app;
