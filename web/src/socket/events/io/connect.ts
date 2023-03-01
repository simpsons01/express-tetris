import type { Server as SocketServer, Socket } from "socket.io";
import roomTimerStore from "../../stores/roomTimer";
import scoreUpdateManagerStore from "../../stores/scoreUpdateOperationManager";
import logger from "../../../config/logger";
import disconnectEvt from "../socket/disconnect";
import gameDataUpdatedEvt from "../socket/gameDataUpdated";
import pingEvt from "../socket/ping";
import resetRoomEvt from "../socket/resetRoom";
import roomConfigEvt from "../socket/roomConfig";
import readyEvt from "../socket/ready";
import { isNil } from "ramda";

export default (io: SocketServer) => {
  return async (socket: Socket) => {
    const roomId = socket.data.roomId;
    const playerName = socket.data.player.name;

    logger.info(`player "${playerName}" connect and join room ${roomId}`);

    socket.join(roomId);

    const scoreUpdateManager = scoreUpdateManagerStore.get(roomId);
    if (isNil(scoreUpdateManager)) {
      scoreUpdateManagerStore.create(roomId);
    }

    const roomTimer = roomTimerStore.get(roomId);
    if (isNil(roomTimer)) {
      roomTimerStore.create(roomId);
    }

    socket.on("ready", readyEvt(io, socket));
    socket.on("game_data_updated", gameDataUpdatedEvt(io, socket));
    socket.on("reset_room", resetRoomEvt(io, socket));
    socket.on("room_config", roomConfigEvt(io, socket));
    socket.on("ping", pingEvt(io, socket));
    socket.on("disconnect", disconnectEvt(io, socket));
  };
};
