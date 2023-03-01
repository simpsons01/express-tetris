import { IPlayer } from "../utils/types";

declare module "express-serve-static-core" {
  export interface Request {
    player: IPlayer | undefined;
  }
}
