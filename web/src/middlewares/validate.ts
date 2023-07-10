import type { Response, Request, NextFunction } from "express";
import type { ObjectSchema } from "joi";
import HTTP_STATUS_CODES from "../common/httpStatusCode";
import { createResponseError } from "../common/error";
import { isNil } from "ramda";

const validateMiddleware =
  (
    schema: ObjectSchema,
    extractData: (req: Request) => unknown = (req) => req.body
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    const data = extractData(req);
    const validateRes = schema.validate(data);
    if (!isNil(validateRes.error)) {
      return next(
        createResponseError(
          HTTP_STATUS_CODES.BAD_REQUEST,
          validateRes.error.details.map(({ message }) => message).join(",")
        )
      );
    }
    next();
  };

export default validateMiddleware;
