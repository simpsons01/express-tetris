import { IPlayer } from "./types";
import crypto from "crypto";

export const createPlayer = (name: string): IPlayer => ({
  id: crypto.randomUUID(),
  name,
});
