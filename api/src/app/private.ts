import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import env from "../config/env";
import { connect as connectToRedis } from "../config/redis";
import { isDev } from "../utils/index";
import errorMiddleware from "../middlewares/error";
import { createErrorResponse } from "../utils/error";
import { HTTP_STATUS_CODES } from "../utils/httpStatus";
import passport from "passport";
import JwtStrategy from "../config/passport/JwtStrategy";
import roomRoute from "../routes/private/room";
import authMiddleware from "../middlewares/auth";

const run = async () => {
  await connectToRedis();
  const app = express();
  if (!isDev()) app.set("trust proxy", true);
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(passport.initialize());
  passport.use(JwtStrategy);

  app.get("/health-check", (req, res) => res.status(200).end());
  app.get("/auth-check", authMiddleware, (req, res) =>
    res.status(HTTP_STATUS_CODES.OK).send()
  );
  app.use("/room", roomRoute);
  app.use((req: Request, res: Response, next: NextFunction) =>
    next(createErrorResponse(HTTP_STATUS_CODES.NOT_FOUND))
  );
  app.use(errorMiddleware);
  const port = env.PORT || 3030;
  app.listen(env.PORT || 3030, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
};

export default run;
