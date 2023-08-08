import type { IRoom } from "../common/types";
import { isNil } from "ramda";
import redisClient from "../config/redis";

const getRoomIds = async (): Promise<Array<string>> => {
  const roomIds = await redisClient.sMembers("rooms");
  return roomIds ?? [];
};

const getRoom = async (roomId: string): Promise<IRoom | null> => {
  const room = await redisClient.get(`room:${roomId}`);
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

const getRooms = async (): Promise<Array<IRoom>> => {
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

const createRoom = async (room: IRoom) => {
  await redisClient.set(`room:${room.id}`, JSON.stringify(room));
  await redisClient.sAdd("rooms", room.id);
};

const updateRoom = async (room: IRoom) => {
  await redisClient.set(`room:${room.id}`, JSON.stringify(room));
};

const deleteRoom = async (roomId: string) => {
  await redisClient.sRem("rooms", roomId);
  await redisClient.del(`room:${roomId}`);
};

export default {
  getRoomIds,
  getRoom,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
};
