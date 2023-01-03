import { isNil } from "ramda";
import { getRedisClient } from "../config/redis";
import { IPlayer } from "./player";

export type RoomConfig = {
  initialLevel: number;
  playerLimitNum: number;
  sec: number;
};

export enum ROOM_STATE {
  CREATED,
  GAME_START,
  GAME_INTERRUPT,
  GAME_END,
}

export enum PLAYER_STATE {
  READY = "ready",
  NOT_READY = "not_ready",
}

export interface IRoom {
  id: string;
  name: string;
  host: IPlayer;
  config: RoomConfig;
  state: ROOM_STATE;
  players: Array<IPlayer & { ready: PLAYER_STATE }>;
}

export const getRoom = async (roomId: string): Promise<IRoom | null> => {
  const redis = getRedisClient();
  const room = await redis.get(`room:${roomId}`);
  if (!isNil(room)) {
    try {
      return JSON.parse(room) as IRoom;
    } catch (err) {
      return null;
    }
  } else {
    return null;
  }
};

export const updateRoom = async (room: IRoom) => {
  const redis = getRedisClient();
  await redis.set(`room:${room.id}`, JSON.stringify(room));
};

export const deleteRoom = async (roomId: string) => {
  const redis = getRedisClient();
  await redis.sRem("rooms", roomId);
  await redis.del(`room:${roomId}`);
};
