import { Response, Request, NextFunction } from "express";
import { createErrorResponse } from "../utils/error";
import passport from "passport";
import { HTTP_STATUS_CODES } from "../utils/httpStatus";
import { isNil } from "ramda";

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate("jwt", { session: false }, (err, player) => {
    if (err) {
      return next(err);
    }
    if (isNil(player)) {
      return next(createErrorResponse(HTTP_STATUS_CODES.UNAUTHORIZED));
    } else {
      req.player = player;
      next();
    }
  })(req, res, next);
};

export default authMiddleware;
