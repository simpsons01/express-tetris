import type { Response, Request, NextFunction } from "express";
import HTTP_STATUS_CODES from "../common/httpStatusCode";
import logger from "../config/logger";
import { isResponseError, createResponseError } from "../common/error";
import { isNil } from "ramda";

const errorMiddleware = async (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err);
  if (isResponseError(err)) {
    return res.status(err.status).json({
      message: err.message,
      ...(isNil(err.code) ? { code: err.code } : {}),
    });
  }
  const defaultErrorResponse = createResponseError(
    HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
  );
  res.status(defaultErrorResponse.status).json({
    message: defaultErrorResponse.message,
  });
};

export default errorMiddleware;
