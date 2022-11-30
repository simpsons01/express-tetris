import { HTTP_STATUS_CODES } from "./../utils/httpStatus";
import { createErrorResponse } from "./../utils/error";
import { Response, Request, NextFunction } from "express";
import * as roomService from "../services/room";
import * as playerService from "../services/player";
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
  const { name, config } = req.body as {
    name: string;
    config?: { initialLevel: number };
  };
  const self = req.player as IPlayer;
  const rooms = await roomService.getRooms();
  for (const room of rooms) {
    if (!isNil(room) && room.name === name) {
      return next(
        createErrorResponse(HTTP_STATUS_CODES.BAD_REQUEST, "room name exist")
      );
    }
  }
  const roomId = crypto.randomUUID();
  const defaultRoomConfig = {
    initialLevel: 1,
    playerLimitNum: 2,
  };
  const newRoom = {
    id: roomId,
    name,
    hostId: self.id,
    players: [self],
    config: {
      ...defaultRoomConfig,
      ...(isNil(config) ? {} : config),
    },
  };
  await roomService.createRoom(newRoom);
  res.status(HTTP_STATUS_CODES.OK).json({ roomId });
};

export const joinRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const roomId = req.params.roomId;
  const self = req.player as IPlayer;
  const room = await roomService.getRoom(roomId);
  if (isNil(room)) {
    return next(
      createErrorResponse(HTTP_STATUS_CODES.NOT_FOUND, "room does not exist")
    );
  }
  if (room.players.length >= room.config.playerLimitNum) {
    return next(
      createErrorResponse(HTTP_STATUS_CODES.BAD_REQUEST, "room is full")
    );
  }
  await roomService.updateRoom({
    ...room,
    players: [...room.players, self],
  });
  res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
};

export const leaveRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const roomId = req.params.roomId;
  const self = req.player as IPlayer;
  const room = await roomService.getRoom(roomId);
  if (isNil(room)) {
    return next(
      createErrorResponse(HTTP_STATUS_CODES.NOT_FOUND, "room does not exist")
    );
  }
  if (!room.players.find((player) => player.id === self.id)) {
    return next(
      createErrorResponse(
        HTTP_STATUS_CODES.BAD_REQUEST,
        "self does not exist in the room"
      )
    );
  }
  if (room.hostId === self.id) {
    await roomService.deleteRoom(roomId);
    res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
  } else {
    const newRoom = {
      ...room,
      players: room.players.filter((player) => player.id !== self.id),
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

export const addNewPlayerToRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { roomId, playerName } = req.body;
  const room = await roomService.getRoom(roomId);
  const player = await playerService.getPlayer(playerName);
  if (isNil(room)) {
    return next(
      createErrorResponse(HTTP_STATUS_CODES.NOT_FOUND, "room does not exist")
    );
  }
  if (isNil(player)) {
    return next(
      createErrorResponse(HTTP_STATUS_CODES.NOT_FOUND, "player does not exist")
    );
  }
  if (room.players.length >= room.config.playerLimitNum) {
    return next(
      createErrorResponse(HTTP_STATUS_CODES.BAD_REQUEST, "room is full")
    );
  }
  await roomService.updateRoom({
    ...room,
    players: [...room.players, player],
  });
  res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
};

export const removePlayerFromRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { roomId, playerName } = req.body;
  const room = await roomService.getRoom(roomId);
  const player = await playerService.getPlayer(playerName);
  if (isNil(room)) {
    return next(
      createErrorResponse(HTTP_STATUS_CODES.BAD_REQUEST, "room does not exist")
    );
  }
  if (isNil(player)) {
    return next(
      createErrorResponse(
        HTTP_STATUS_CODES.BAD_REQUEST,
        "player does not exist"
      )
    );
  }
  if (!room.players.find((player) => player.id === player.id)) {
    return next(
      createErrorResponse(
        HTTP_STATUS_CODES.BAD_REQUEST,
        "player does not exist in the room"
      )
    );
  }
  if (room.hostId === player.id) {
    await roomService.deleteRoom(roomId);
    res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
  } else {
    const newRoom = {
      ...room,
      players: room.players.filter((player) => player.id !== player.id),
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
