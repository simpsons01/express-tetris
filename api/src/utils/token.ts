import { IPlayer } from "../services/player";
import env from "../config/env";
import jwt from "jsonwebtoken";
import { isNil } from "ramda";

const secret = env.JWT_SECRET as string;

export const isJWTExpireError = (err: any) =>
  !isNil(err) && err.name === "TokenExpiredError";

export const isJWTTokenError = (err: any) =>
  !isNil(err) && err.name === "JsonWebTokenError";

export const signToken = ({ name, id }: IPlayer) => {
  const token = jwt.sign({ name, id }, secret, { expiresIn: 60 * 60 });
  return token;
};
