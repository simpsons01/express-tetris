import { isNil } from "ramda";
import { isDev } from "./../utils/index";
import { isErrorResponse } from "./../utils/error";
import { Response, Request, NextFunction } from "express";
import { createErrorResponse } from "../utils/error";
import { HTTP_STATUS_CODES } from "../utils/httpStatus";

const errorMiddleware = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (isDev()) {
    if (!isNil(err)) {
      if (isErrorResponse(err)) {
        console.log(err.stack);
      } else {
        console.log(err);
      }
    }
  }
  if (isErrorResponse(err)) {
    return res.status(err.status).json(err.data);
  }
  const defaultErrorResponse = createErrorResponse(
    HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
  );
  res.status(defaultErrorResponse.status).json(defaultErrorResponse.data);
};

export default errorMiddleware;
