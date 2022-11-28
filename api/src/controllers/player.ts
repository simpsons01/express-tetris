import { signToken } from "./../services/token";
import { HTTP_STATUS_CODES } from "../utils/httpStatus";
import { createErrorResponse } from "../utils/error";
import { Response, Request, NextFunction } from "express";
import * as playerService from "../services/player";
import crypto from "crypto";
import { isNil } from "ramda";

export const createPlayer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name } = req.body;
  const player = await playerService.getPlayer(name);
  if (!isNil(player)) {
    return next(
      createErrorResponse(HTTP_STATUS_CODES.BAD_REQUEST, "player name is exist")
    );
  }
  const playerId = crypto.randomUUID();
  const newPlayer = {
    id: playerId,
    name,
  };
  await playerService.createPlayer(newPlayer);
  const token = signToken(newPlayer);
  res.status(HTTP_STATUS_CODES.OK).json({ player: { id: playerId }, token });
};
