import { HTTP_STATUS_CODES } from "./../utils/httpStatus";
import { createErrorResponse } from "./../utils/error";
import { Response, Request, NextFunction } from "express";
import * as roomService from "../services/room";
import crypto from "crypto";
import { isEmpty, isNil } from "ramda";
import { IPlayer } from "../services/player";

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
      createErrorResponse(HTTP_STATUS_CODES.NOT_FOUND, "room does not exist")
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
  const { name } = req.body;
  const rooms = await roomService.getRooms();
  for (const room of rooms) {
    if (!isNil(room) && room.name === name) {
      return next(
        createErrorResponse(HTTP_STATUS_CODES.BAD_REQUEST, "room name exist")
      );
    }
  }
  const roomId = crypto.randomUUID();
  const player = req.player as IPlayer;
  const newRoom = roomService.createRoomObject(roomId, player.name, player.id, [
    player,
  ]);
  await roomService.createRoom(newRoom);
  res.status(HTTP_STATUS_CODES.OK).json({ roomId });
};

export const addNewPlayerToRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { roomId, player: newPlayer } = req.body;
  const room = await roomService.getRoom(roomId);
  if (isNil(room)) {
    return next(
      createErrorResponse(HTTP_STATUS_CODES.NOT_FOUND, "room does not exist")
    );
  }
  if (room.players.length >= room.playerLimitNum) {
    return next(
      createErrorResponse(HTTP_STATUS_CODES.BAD_REQUEST, "room is full")
    );
  }
  await roomService.updateRoom({
    ...room,
    players: [...room.players, newPlayer],
  });
  res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
};

export const removePlayerFromRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { roomId, playerId } = req.body;
  const room = await roomService.getRoom(roomId);
  if (isNil(room)) {
    return next(
      createErrorResponse(HTTP_STATUS_CODES.NOT_FOUND, "room does not exist")
    );
  }
  if (!room.players.find((player) => player.id === playerId)) {
    return next(
      createErrorResponse(
        HTTP_STATUS_CODES.NOT_FOUND,
        "player does not exist in the room"
      )
    );
  }
  if (room.hostId === playerId) {
    await roomService.deleteRoom(roomId);
    res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
  } else {
    const newRoom = {
      ...room,
      players: room.players.filter((player) => player.id !== playerId),
    };
    if (isEmpty(newRoom.players)) {
      await roomService.deleteRoom(roomId);
      res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
    } else {
      await roomService.updateRoom(newRoom);
      res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
    }
  }
};
