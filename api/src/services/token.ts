import { IPlayer } from "./player";
import env from "../config/env";
import jwt from "jsonwebtoken";

const secret = env.JWT_SECRET as string;

export const signToken = ({ name, id }: IPlayer) => {
  const token = jwt.sign({ name, id }, secret, { expiresIn: 30 });
  return token;
};
