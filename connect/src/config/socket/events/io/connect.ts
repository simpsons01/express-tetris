import { Server as SocketServer, Socket } from "socket.io";
import { isNil } from "ramda";
import * as playerStoreUtils from "../../../../utils/playerStore";
import * as roomTimerUtils from "../../../../utils/roomTimer";

import { disconnectEvt } from "../socket/disconnect";
import { gameDataUpdatedEvt } from "../socket/gameDataUpdated";
import { pingEvt } from "../socket/ping";
import { resetRoomEvt } from "../socket/resetRoom";
import { roomConfigEvt } from "../socket/roomConfig";
import { readyEvt } from "../socket/ready";

export const connectEvt = (io: SocketServer) => {
  return async (socket: Socket) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.player.id;

    socket.join(roomId);
    const playerStore = (() => {
      let _ = playerStoreUtils.getPlayerStore(roomId);
      if (isNil(_)) {
        _ = playerStoreUtils.createPlayerStore(roomId);
      }
      return _;
    })();
    playerStore.addPlayer(playerId);

    const roomTimer = roomTimerUtils.getRoomTimer(roomId);
    if (isNil(roomTimer)) {
      roomTimerUtils.createRoomTimer(roomId);
    }

    socket.on("ready", readyEvt(io, socket));
    socket.on("game_data_updated", gameDataUpdatedEvt(io, socket));
    socket.on("reset_room", resetRoomEvt(io, socket));
    socket.on("room_config", roomConfigEvt(io, socket));
    socket.on("ping", pingEvt(io, socket));
    socket.on("disconnect", disconnectEvt(io, socket));
  };
};
