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
