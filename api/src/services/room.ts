import { isNil } from "ramda";
import { getRedisClient } from "../config/redis";
import { IPlayer } from "./player";

export enum ROOM_STATE {
  CREATED,
  WAITING_ROOM_FULL,
  GAME_BEFORE_START,
  GAME_START,
  GAME_INTERRUPT,
  GAME_END,
}

interface IRoom {
  id: string;
  name: string;
  hostId: string;
  playerLimitNum: number;
  initialState: ROOM_STATE;
  players: Array<IPlayer>;
}

export const createRoomObject = (
  id: string,
  name: string,
  hostId: string,
  players: Array<IPlayer> = [],
  playerLimitNum = 2,
  initialState: ROOM_STATE = ROOM_STATE.CREATED
): IRoom => ({
  id,
  name,
  hostId,
  playerLimitNum,
  initialState,
  players,
});

export const getRoomIds = async (): Promise<Array<string>> => {
  const redis = getRedisClient();
  const roomIds = await redis.sMembers("rooms");
  return roomIds ?? [];
};

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

export const getRooms = async (): Promise<Array<IRoom | null>> => {
  const rooms = [];
  const roomIds = await getRoomIds();
  for (const roomId of roomIds) {
    const room = await getRoom(roomId);
    if (!isNil(room)) {
      rooms.push(room);
    }
  }
  return rooms;
};

export const createRoom = async (room: IRoom) => {
  const redis = getRedisClient();
  await redis.set(`room:${room.id}`, JSON.stringify(room));
  await redis.sAdd("rooms", room.id);
};

export const updateRoom = async (room: IRoom) => {
  const redis = getRedisClient();
  await redis.set(room.id, JSON.stringify(room));
};

export const deleteRoom = async (roomId: string) => {
  const redis = getRedisClient();
  await redis.sRem("rooms", roomId);
  await redis.del(roomId);
};
