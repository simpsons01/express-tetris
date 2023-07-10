import type { IPlayer } from "../common/types";
import Player from "../models/player";
import { isNil } from "ramda";
import { toHex } from "../common/utils";

const getPlayer = async (playerName: string): Promise<IPlayer | null> => {
  const playerNameHex = toHex(playerName);
  const resPlayer = await Player.get(playerNameHex);
  if (!isNil(resPlayer)) {
    try {
      return JSON.parse(resPlayer) as IPlayer;
    } catch (err) {
      return null;
    }
  } else {
    return null;
  }
};

const createPlayer = async (player: IPlayer) => {
  const playerNameHex = toHex(player.name);
  await Player.create(playerNameHex, player, {
    EX: 60 * 60,
  });
};

const deletePlayer = async (playerName: string) => {
  const playerNameHex = toHex(playerName);
  await Player.delete(playerNameHex);
};

export default {
  getPlayer,
  createPlayer,
  deletePlayer,
};
