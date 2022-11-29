import httpStatus from "http-status";
import { isNil } from "ramda";
import { HTTP_STATUS_CODES } from "./httpStatus";
import { Response, Request, NextFunction } from "express";

interface IErrorResponse {
  status: HTTP_STATUS_CODES;
  data: {
    message: string;
    errorCode?: string;
  };
}

class ErrorResponse implements IErrorResponse {
  status: HTTP_STATUS_CODES;
  data: IErrorResponse["data"];
  constructor(
    status: HTTP_STATUS_CODES,
    { message, errorCode }: IErrorResponse["data"]
  ) {
    this.status = status;
    this.data = {
      message,
      ...(errorCode ? { errorCode } : {}),
    };
  }
}

export const isErrorResponse = (err: any) => err instanceof ErrorResponse;

export const createErrorResponse = (
  status: HTTP_STATUS_CODES = HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
  message?: string,
  errorCode?: string
): IErrorResponse => {
  if (isNil(message)) message = httpStatus[status];
  const error = new ErrorResponse(status, { message, errorCode });
  Error.captureStackTrace(error, createErrorResponse);
  return error;
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
