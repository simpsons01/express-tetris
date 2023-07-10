import type { Response, Request, NextFunction } from "express";
import type { IPlayer } from "../common/types";
import HTTP_STATUS_CODES from "../common/httpStatusCode";
import roomService from "../services/room";
import { createResponseError } from "../common/error";
import {
  checkPlayerIsInRoom,
  checkRoomIsFull,
  createNewRoom,
  createNewRoomJoinedPlayer,
  createNewRoomRemovedPlayer,
} from "../common/room";
import { isEmpty, isNil } from "ramda";

export const getRooms = async (req: Request, res: Response) => {
  const rooms = await roomService.getRooms();
  res.status(HTTP_STATUS_CODES.OK).json({ list: rooms });
};

export const getRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const room = await roomService.getRoom(req.params.id);
  if (isNil(room)) {
    next(
      createResponseError(HTTP_STATUS_CODES.NOT_FOUND, "room was not found")
    );
  } else {
    res.status(HTTP_STATUS_CODES.OK).json({ ...room });
  }
};

export const createRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, config } = req.body as {
    name: string;
    config?: { initialLevel: number; sec: number };
  };
  const self = req.player as IPlayer;
  const rooms = await roomService.getRooms();
  for (const room of rooms) {
    if (!isNil(room) && room.name === name) {
      return next(
        createResponseError(HTTP_STATUS_CODES.BAD_REQUEST, "room name exist")
      );
    }
  }
  const newRoom = createNewRoom(name, self, config);
  await roomService.createRoom(newRoom);
  res.status(HTTP_STATUS_CODES.OK).json({ roomId: newRoom.id });
};

export const joinRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const roomId = req.params.id;
  const self = req.player as IPlayer;
  const room = await roomService.getRoom(roomId);
  if (isNil(room)) {
    return next(
      createResponseError(HTTP_STATUS_CODES.NOT_FOUND, "room was not found")
    );
  }
  if (checkRoomIsFull(room)) {
    return next(
      createResponseError(HTTP_STATUS_CODES.BAD_REQUEST, "room is full")
    );
  }
  await roomService.updateRoom(createNewRoomJoinedPlayer(room, self));
  res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
};

export const leaveRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const roomId = req.params.id;
  const self = req.player as IPlayer;
  const room = await roomService.getRoom(roomId);
  if (isNil(room)) {
    return next(
      createResponseError(HTTP_STATUS_CODES.NOT_FOUND, "room was not found")
    );
  }
  if (!checkPlayerIsInRoom(room, self.id)) {
    return next(
      createResponseError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        "self does not exist in the room"
      )
    );
  }
  if (room.host.id === self.id) {
    await roomService.deleteRoom(roomId);
    res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
  } else {
    const newRoom = createNewRoomRemovedPlayer(room, self.id);
    if (isEmpty(newRoom.players)) {
      await roomService.deleteRoom(roomId);
      res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
    } else {
      await roomService.updateRoom(newRoom);
      res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
    }
  }
};
