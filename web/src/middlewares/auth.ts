import type { Response, Request, NextFunction } from "express";
import type { JwtPayload } from "jsonwebtoken";
import HTTP_STATUS_CODES from "../utils/httpStatusCode";
import playerService from "../services/player";
import { verifyToken } from "./../utils/token";
import { createResponseError } from "../utils/error";
import { isNil, is } from "ramda";

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const notAuthHandler = (message?: string) =>
    next(createResponseError(HTTP_STATUS_CODES.UNAUTHORIZED, message));

  const authorizationHeader = req.headers["authorization"];
  if (isNil(authorizationHeader)) {
    return notAuthHandler("no authorization token was found");
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (isNil(scheme) || isNil(token) || !/^Bearer$/i.test(scheme)) {
    return notAuthHandler("format is Authorization: Bearer [token]");
  }

  let decode: JwtPayload | undefined;
  try {
    decode = verifyToken(token) as JwtPayload;
  } catch (error) {
    if (is(Error, error)) {
      return notAuthHandler(error.message);
    } else {
      return next(createResponseError());
    }
  }

  const player = await playerService.getPlayer(decode.name);
  if (isNil(player)) {
    return notAuthHandler("player is not exist");
  }

  req.player = player;
  next();
};

export default authMiddleware;
