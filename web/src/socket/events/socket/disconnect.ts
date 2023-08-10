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
    this.logInfo(`player "${this.player.name}" disconnect`);
    try {
      const room = await roomService.getRoom(this.roomId);
      if (isNil(room)) {
        throw new Error("room was not found");
      }
      const selfLeaveRoom = createNewRoomRemovedPlayer(room, this.player.id);
      const isNewRoomEmpty = checkRoomIsEmpty(selfLeaveRoom);
      const isHost = room.host.id === this.player.id;
      if (isNewRoomEmpty || isHost) {
        const roomTimer = roomTimerStore.get(this.roomId);
        if (!isNil(roomTimer)) {
          roomTimer.clear();
          roomTimerStore.delete(this.roomId);
        }
        const scoreUpdateOperationManager =
          scoreUpdateOperationManagerStore.get(this.roomId);
        if (!isNil(scoreUpdateOperationManager)) {
          scoreUpdateOperationManager.clear();
          scoreUpdateOperationManagerStore.delete(this.roomId);
        }
        await roomService.deleteRoom(this.roomId);
        if (isHost) this._io.in(this.roomId).emit("room_host_leave");
      } else {
        if (room.state === ROOM_STATE.GAME_START) {
          await roomService.updateRoom(
            createNewRoomState(selfLeaveRoom, ROOM_STATE.GAME_INTERRUPT)
          );
          const roomTimer = roomTimerStore.get(this.roomId);
          if (!isNil(roomTimer)) {
            roomTimer.clear();
          }
          const scoreUpdateOperationManager =
            scoreUpdateOperationManagerStore.get(this.roomId);
          if (!isNil(scoreUpdateOperationManager)) {
            scoreUpdateOperationManager.clear();
          }
          this._io.in(this.roomId).emit("room_participant_leave");
        } else {
          await roomService.updateRoom(selfLeaveRoom);
        }
      }
    } catch (error) {
      this.onError(error as Error);
    }
  }
}

export default DisconnectEvent;
