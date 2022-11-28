import { Response, Request, NextFunction } from "express";
import { isPlainObject } from "../utils";
import { createErrorResponse } from "../utils/error";
import { HTTP_STATUS_CODES } from "../utils/httpStatus";

const errorMiddleware = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (isPlainObject(err) && err.status && err.data) {
    return res.status(err.status).json(err.data);
  }
  const defaultErrorResponse = createErrorResponse(
    HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
  );
  res.status(defaultErrorResponse.status).json(defaultErrorResponse.data);
};

export default errorMiddleware;
