import type { SignOptions } from "jsonwebtoken";
import { isNil } from "ramda";
import jwt from "jsonwebtoken";
import env from "../config/env";

export const signToken = (payload: any, options?: SignOptions) => {
  const secret = env.JWT_SECRET;
  if (isNil(secret)) throw new Error("jwt secret is required");
  const token = jwt.sign(payload, secret, options);
  return token;
};

export const verifyToken = (token: string) => {
  const secret = env.JWT_SECRET;
  if (isNil(secret)) throw new Error("jwt secret is required");
  return jwt.verify(token, secret);
};
