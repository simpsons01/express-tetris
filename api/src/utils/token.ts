import { isNil } from "ramda";

export const isJWTExpireError = (err: any) =>
  !isNil(err) && err.name === "TokenExpiredError";

export const isJWTTokenError = (err: any) =>
  !isNil(err) && err.name === "JsonWebTokenError";
