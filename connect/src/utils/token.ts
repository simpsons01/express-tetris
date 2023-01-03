import { isNil } from "ramda";
import jwt from "jsonwebtoken";
import env from "../config/env";

export const verify = (token: string) => {
  const secret = env.JWT_SECRET;
  if (isNil(secret)) throw new Error("jwt secret is required");
  return jwt.verify(token, secret);
};
