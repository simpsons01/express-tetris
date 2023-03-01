import type { IRoom } from "../utils/types";
import { isNil } from "ramda";
import Room from "../models/room";

const getRoomIds = async (): Promise<Array<string>> => {
  const roomIds = await Room.getIds();
  return roomIds ?? [];
};

const getRoom = async (roomId: string): Promise<IRoom | null> => {
  const room = await Room.get(roomId);
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
  await Room.create(room.id, room);
  await Room.createId(room.id);
};

const updateRoom = async (room: IRoom) => {
  await Room.update(room.id, room);
};

const deleteRoom = async (roomId: string) => {
  await Room.delete(roomId);
  await Room.deleteId(roomId);
};

export default {
  getRoomIds,
  getRoom,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
};
