import type { Response, Request, NextFunction } from "express";
import { isNil } from "ramda";
import httpStatus from "http-status";
import HTTP_STATUS_CODES from "./httpStatusCode";

class ResponseError extends Error {
  status: HTTP_STATUS_CODES;
  code?: string;
  constructor(
    status: HTTP_STATUS_CODES,
    { message, code }: { message: string; code?: string }
  ) {
    super(message);
    this.status = status;
    if (!isNil(code)) {
      this.code = code;
    }
  }
}

export const isResponseError = (err: unknown): err is ResponseError =>
  err instanceof ResponseError;

export const createResponseError = (
  status: HTTP_STATUS_CODES = HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
  message?: string,
  code?: string
): ResponseError => {
  if (isNil(message)) message = httpStatus[status];
  const error = new ResponseError(status, { message, code });
  return error;
};

export const catchAsyncError =
  <
    Req extends Request = Request,
    Res extends Response = Response,
    N extends NextFunction = NextFunction
  >(
    middleware: (req: Req, res: Res, next: N) => void
  ) =>
  async (req: Req, res: Res, next: N) => {
    try {
      await middleware(req, res, next);
    } catch (err) {
      next(err);
    }
  };
