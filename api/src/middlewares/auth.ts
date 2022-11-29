import { isJWTTokenError, isJWTExpireError } from "./../utils/token";
import { Response, Request, NextFunction } from "express";
import { createErrorResponse } from "../utils/error";
import passport from "passport";
import { HTTP_STATUS_CODES } from "../utils/httpStatus";

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate("jwt", { session: false }, (err, player, info) => {
    if (isJWTTokenError(info) || isJWTExpireError(info)) {
      return next(
        createErrorResponse(HTTP_STATUS_CODES.UNAUTHORIZED, info.message)
      );
    }
    if (err) {
      return next(err);
    }
    if (player) {
      req.player = player;
      next();
    } else {
      next(createErrorResponse(HTTP_STATUS_CODES.UNAUTHORIZED));
    }
  })(req, res, next);
};

export default authMiddleware;
