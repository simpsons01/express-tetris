import { isNil } from "ramda";
import { getRedisClient } from "../config/redis";

export interface IPlayer {
  name: string;
  id: string;
}

export const getPlayerIds = async (): Promise<Array<string>> => {
  const redis = getRedisClient();
  const playerIds = await redis.sMembers("players");
  return playerIds ?? [];
};

export const getPlayer = async (playerId: string): Promise<IPlayer | null> => {
  const redis = getRedisClient();
  const player = await redis.get(`player:${playerId}`);
  if (!isNil(player)) {
    try {
      return JSON.parse(player) as IPlayer;
    } catch (err) {
      return null;
    }
  } else {
    return null;
  }
};

export const getPlayers = async (): Promise<Array<IPlayer | null>> => {
  const players = [];
  const playerIds = await getPlayerIds();
  for (const playerId of playerIds) {
    const player = await getPlayer(playerId);
    if (!isNil(player)) {
      players.push(player);
    }
  }
  return players;
};

export const createPlayer = async (player: IPlayer) => {
  const redis = getRedisClient();
  await redis.set(`player:${player.id}`, JSON.stringify(player));
  await redis.sAdd("players", player.id);
};

export const deletePlayer = async (playerId: string) => {
  const redis = getRedisClient();
  await redis.sRem("player", playerId);
  await redis.del(playerId);
};
