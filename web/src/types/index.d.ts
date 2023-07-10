import { IPlayer } from "../common/types";

declare module "express-serve-static-core" {
  export interface Request {
    player: IPlayer | undefined;
  }
}
