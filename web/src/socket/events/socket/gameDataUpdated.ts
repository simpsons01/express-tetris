import type { Server as SocketServer, Socket } from "socket.io";
import scoreUpdateOperationManagerStore from "../../stores/scoreUpdateOperationManager";
import roomService from "../../../services/room";
import { createNewRoomPlayerScore } from "../../../common/room";
import { isNil } from "ramda";
import { SocketEvents } from "../event";

enum GAME_STATE_TYPE {
  NEXT_TETRIMINO_BAG = "NEXT_TETRIMINO_BAG",
  HOLD_TETRIMINO = "HOLD_TETRIMINO",
  MATRIX = "MATRIX",
  SCORE = "SCORE",
  LEVEL = "LEVEL",
  LINE = "LINE",
}

type UpdatePayloads = Array<{ data: any; type: GAME_STATE_TYPE }>;

class GameDataUpdatedEvent extends SocketEvents {
  constructor(io: SocketServer, socket: Socket) {
    super(io, socket);
    this.listener = this.listener.bind(this);
    this.logError = this.logError.bind(this);
    this.logInfo = this.logInfo.bind(this);
    this.onError = this.onError.bind(this);
  }

  async listener(updatedPayloads: UpdatePayloads) {
    const { player, roomId } = this.socketData;
    const scoreUpdateOperationManager =
      scoreUpdateOperationManagerStore.get(roomId);
    try {
      if (isNil(scoreUpdateOperationManager)) {
        throw new Error("scoreUpdateOperationManager was not found");
      }
      this._socket.to(roomId).emit("other_game_data_updated", updatedPayloads);
      const scorePayload = updatedPayloads.find(
        (payload) => payload.type === GAME_STATE_TYPE.SCORE
      );
      if (!isNil(scorePayload)) {
        scoreUpdateOperationManager.add(async () => {
          try {
            const room = await roomService.getRoom(roomId);
            if (isNil(room)) {
              throw new Error("room was not found");
            }
            roomService.updateRoom(
              createNewRoomPlayerScore(room, player.id, scorePayload.data)
            );
          } catch (error) {
            this.onError(error);
          }
        });
      }
    } catch (error) {
      this.onError(error);
    }
  }
}

export default GameDataUpdatedEvent;
