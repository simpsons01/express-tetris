import { AxiosResponse } from "axios";
import http from "../utils/http";

export const getRoom = async (roomId: string) =>
  await http.get<
    any,
    AxiosResponse<{
      room: {
        id: string;
        name: string;
        hostId: string;
        config: {
          initialLevel: number;
          playerLimitNum: number;
        };
        players: Array<{ name: string; id: string }>;
      };
    }>
  >(`/room/${roomId}`);

export const removePlayerFromRoom = async (payload: {
  roomId: string;
  playerName: string;
}) =>
  await http.post("/room/remove-player", {
    data: payload,
  });
