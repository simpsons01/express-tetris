import type { IPlayer } from "../common/types";
import { isNil } from "ramda";
import { toHex } from "../common/utils";
import redisClient from "../config/redis";

const getPlayer = async (playerName: string): Promise<IPlayer | null> => {
  const playerNameHex = toHex(playerName);
  const resPlayer = await redisClient.get(`player:${playerNameHex}`);
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
  await redisClient.set(`player:${playerNameHex}`, JSON.stringify(player), {
    EX: 60 * 60,
  });
};

const deletePlayer = async (playerName: string) => {
  const playerNameHex = toHex(playerName);
  await redisClient.del(`player:${playerNameHex}`);
};

export default {
  getPlayer,
  createPlayer,
  deletePlayer,
};
