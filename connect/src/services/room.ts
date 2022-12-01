import http from "../utils/http";

export const removePlayerFromRoom = async (payload: {
  roomId: string;
  playerName: string;
}) =>
  await http.post("/room/remove-player", {
    data: payload,
  });
