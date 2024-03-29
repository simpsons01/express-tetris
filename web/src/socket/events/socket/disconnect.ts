import type { Server as SocketServer, Socket } from "socket.io";
import roomService from "../../../services/room";
import scoreUpdateOperationManagerStore from "../../stores/scoreUpdateOperationManager";
import roomTimerStore from "../../stores/roomTimer";
import { isNil } from "ramda";
import {
  createNewRoomRemovedPlayer,
  checkRoomIsEmpty,
  createNewRoomState,
} from "../../../common/room";
import { ROOM_STATE } from "../../../common/types";
import { SocketEvents } from "../event";

class DisconnectEvent extends SocketEvents {
  constructor(io: SocketServer, socket: Socket) {
    super(io, socket);
    this.listener = this.listener.bind(this);
    this.logError = this.logError.bind(this);
    this.logInfo = this.logInfo.bind(this);
    this.onError = this.onError.bind(this);
  }

  async listener() {
    const { player, roomId } = this.socketData;
    this.logInfo(`player "${player.name}" disconnect`);
    try {
      const room = await roomService.getRoom(roomId);
      if (isNil(room)) {
        throw new Error("room was not found");
      }
      const selfLeaveRoom = createNewRoomRemovedPlayer(room, player.id);
      const isNewRoomEmpty = checkRoomIsEmpty(selfLeaveRoom);
      const isHost = room.host.id === player.id;
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
        if (isHost) this._io.in(roomId).emit("room_host_leave");
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
          this._io.in(roomId).emit("room_participant_leave");
        } else {
          await roomService.updateRoom(selfLeaveRoom);
        }
      }
    } catch (error) {
      this.onError(error);
    }
  }
}

export default DisconnectEvent;
