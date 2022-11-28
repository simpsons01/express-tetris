import httpStatus from "http-status";
import { isNil } from "ramda";
import { HTTP_STATUS_CODES } from "./httpStatus";
import { Response, Request, NextFunction } from "express";

export interface ErrorResponse {
  status: HTTP_STATUS_CODES;
  data: {
    message: string;
    errorCode?: string;
  };
}

export const createErrorResponse = (
  status: HTTP_STATUS_CODES = HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
  message?: string,
  errorCode?: string
): ErrorResponse => {
  if (isNil(message)) message = httpStatus[status];
  return {
    status,
    data: {
      message,
      ...(errorCode ? { errorCode } : {}),
    },
  };
};

export const catchAsyncError =
  <
    Req extends Request = Request,
    Res extends Response = Response,
    N extends NextFunction = NextFunction
  >(
    middleware: (req: Req, res: Res, next: N) => any
  ) =>
  async (req: Req, res: Res, next: N) => {
    try {
      await middleware(req, res, next);
    } catch (err) {
      next(err);
    }
  };
