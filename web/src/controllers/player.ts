import type { Response, Request, NextFunction } from "express";
import type { IPlayer } from "../common/types";
import HTTP_STATUS_CODES from "../common/httpStatusCode";
import playerService from "../services/player";
import { isNil } from "ramda";
import { signToken } from "../common/token";
import { createResponseError } from "../common/error";
import { createPlayer as createPlayer } from "../common/player";

export const getPlayer = async (req: Request, res: Response) => {
  const self = req.player as IPlayer;
  res.status(HTTP_STATUS_CODES.OK).json({ player: self });
};

export const createNewPlayer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name } = req.body;
  const player = await playerService.getPlayer(name);
  if (!isNil(player)) {
    return next(
      createResponseError(HTTP_STATUS_CODES.BAD_REQUEST, "player name is exist")
    );
  }
  const newPlayer = createPlayer(name);
  await playerService.createPlayer(newPlayer);
  const token = signToken(newPlayer, { expiresIn: 60 * 60 });
  res.status(HTTP_STATUS_CODES.OK).json({ playerId: newPlayer.id, token });
};
