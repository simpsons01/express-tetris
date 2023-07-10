import { IPlayer } from "./player";

export type RoomConfig = {
  initialLevel: number;
  playerLimitNum: number;
  sec: number;
};

export enum ROOM_STATE {
  CREATED = "created",
  GAME_START = "game_started",
  GAME_INTERRUPT = "game_interrupt",
  GAME_END = "game_end",
}

export enum PLAYER_READY_STATE {
  READY = "ready",
  NOT_READY = "not_ready",
}

export interface IRoomPlayer extends IPlayer {
  ready: PLAYER_READY_STATE;
  score: number;
}

export interface IRoom {
  id: string;
  name: string;
  host: IPlayer;
  config: RoomConfig;
  state: ROOM_STATE;
  players: Array<IRoomPlayer>;
}
