import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import env from "./config/env";
import { connect as connectToRedis } from "./config/redis";
import { isDev } from "./utils/index";
import errorMiddleware from "./middlewares/error";
import { createErrorResponse } from "./utils/error";
import { HTTP_STATUS_CODES } from "./utils/httpStatus";
import passport from "passport";
import JwtStrategy from "./config/passport/JwtStrategy";
import roomRoute from "./routes/room";
import playerRoute from "./routes/player";

const run = async () => {
  try {
    await connectToRedis();
    const app = express();
    if (!isDev()) app.set("trust proxy", true);

    app.use(cors({ origin: env.ALLOW_ORIGIN }));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(passport.initialize({ userProperty: "player" }));
    passport.use(JwtStrategy);

    app.get("/health-check", (req, res) => res.status(200).end());
    app.use("/room", roomRoute);
    app.use("/player", playerRoute);
    app.use((req: Request, res: Response, next: NextFunction) =>
      next(createErrorResponse(HTTP_STATUS_CODES.NOT_FOUND))
    );
    app.use(errorMiddleware);

    const port = env.PORT || 3131;
    app.listen(env.PORT || 3131, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

run();
