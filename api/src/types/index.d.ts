import { IPlayer } from "../services/player";

declare module "express-serve-static-core" {
  export interface Request {
    player: IPlayer | undefined;
  }
}
