import http from "../utils/http";
import { AxiosResponse } from "axios";

export const getRoom = async (roomId: string) =>
  await http.get<
    any,
    AxiosResponse<{
      id: string;
      name: string;
      hostId: string;
      config: {
        initialLevel: number;
        playerLimitNum: number;
      };
      players: Array<{ name: string; id: string }>;
    }>
  >(`/room/${roomId}`);

export const removePlayerFromRoom = async (payload: {
  roomId: string;
  playerName: string;
}) =>
  await http.delete("/room/remove-player", {
    data: payload,
  });
