import type { Server as SocketServer, Socket } from "socket.io";
import roomService from "../../../services/room";
import scoreUpdateOperationManagerStore from "../../stores/scoreUpdateOperationManager";
import roomTimerStore from "../../stores/roomTimer";
import logger from "../../../config/logger";
import { isNil } from "ramda";
import {
  createNewRoomRemovedPlayer,
  checkRoomIsEmpty,
  createNewRoomState,
} from "../../../utils/room";
import { ROOM_STATE } from "../../../utils/types";

export default (io: SocketServer, socket: Socket) => {
  const roomId = socket.data.roomId;
  const playerId = socket.data.player.id;
  const playerName = socket.data.player.name;

  return async () => {
    logger.info(`player "${playerName}" disconnect`);
    try {
      const room = await roomService.getRoom(roomId);
      if (!isNil(room)) {
        const selfLeaveRoom = createNewRoomRemovedPlayer(room, playerId);
        const isNewRoomEmpty = checkRoomIsEmpty(selfLeaveRoom);
        const isHost = room.host.id === playerId;
        if (isNewRoomEmpty || isHost) {
          const roomTimer = roomTimerStore.get(roomId);
          if (!isNil(roomTimer)) {
            roomTimer.clear();
            roomTimerStore.delete(roomId);
          }
          const scoreUpdateOperationManager =
            scoreUpdateOperationManagerStore.get(roomId);
          if (!isNil(scoreUpdateOperationManager)) {
            scoreUpdateOperationManager.clear();
            scoreUpdateOperationManagerStore.delete(roomId);
          }
          await roomService.deleteRoom(roomId);
          if (isHost) io.in(roomId).emit("room_host_leave");
        } else {
          if (room.state === ROOM_STATE.GAME_START) {
            await roomService.updateRoom(
              createNewRoomState(selfLeaveRoom, ROOM_STATE.GAME_INTERRUPT)
            );
            const roomTimer = roomTimerStore.get(roomId);
            if (!isNil(roomTimer)) {
              roomTimer.clear();
            }
            const scoreUpdateOperationManager =
              scoreUpdateOperationManagerStore.get(roomId);
            if (!isNil(scoreUpdateOperationManager)) {
              scoreUpdateOperationManager.clear();
            }
            io.in(roomId).emit("room_participant_leave");
          } else {
            await roomService.updateRoom(selfLeaveRoom);
          }
        }
      } else {
        throw new Error("room was not found");
      }
    } catch (error) {
      io.in(roomId).emit("error_occur", error);
      logger.error(error);
    }
  };
};
