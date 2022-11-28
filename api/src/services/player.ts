import { isNil } from "ramda";
import { getRedisClient } from "../config/redis";
import { toHex } from "../utils";

export interface IPlayer {
  name: string;
  id: string;
}

export const getPlayer = async (
  playerName: string
): Promise<IPlayer | null> => {
  const redis = getRedisClient();
  const playerNameHex = toHex(playerName);
  const resPlayer = await redis.get(`player:${playerNameHex}`);
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

export const createPlayer = async (player: IPlayer) => {
  const redis = getRedisClient();
  await redis.set(`player:${player.id}`, JSON.stringify(player), {
    EXAT: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });
};

export const deletePlayer = async (playerName: string) => {
  const playerNameHex = toHex(playerName);
  const redis = getRedisClient();
  await redis.del(`player:${playerNameHex}`);
};
