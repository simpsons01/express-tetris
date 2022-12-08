import { Response, Request, NextFunction } from "express";
import { createErrorResponse } from "../utils/error";
import { HTTP_STATUS_CODES } from "../utils/httpStatus";
import { ObjectSchema } from "joi";
import { isNil } from "ramda";

const validateMiddleware =
  (
    schema: ObjectSchema,
    extractData: (req: Request) => any = (req) => req.body
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    const data = extractData(req);
    const validateRes = schema.validate(data);
    if (!isNil(validateRes.error)) {
      return next(
        createErrorResponse(
          HTTP_STATUS_CODES.BAD_REQUEST,
          validateRes.error.details.map(({ message }) => message).join(",")
        )
      );
    }
    next();
  };

export default validateMiddleware;
