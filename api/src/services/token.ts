import { IPlayer } from "./player";
import env from "../config/env";
import jwt from "jsonwebtoken";

const secret = env.JWT_SECRET as string;

export const signToken = (
  { name, id }: IPlayer,
  expiresIn: number | string = "7d"
) => {
  const token = jwt.sign({ name, id }, secret, { expiresIn });
  return token;
};
