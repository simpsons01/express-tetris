import { Server as SocketServer, Socket } from "socket.io";
import scoreUpdateOperationManagerStore from "../../stores/scoreUpdateOperationManager";
import logger from "../../../config/logger";
import roomService from "../../../services/room";
import { createNewRoomPlayerScore } from "../../../utils/room";
import { isNil } from "ramda";

enum GAME_STATE_TYPE {
  NEXT_TETRIMINO_BAG = "NEXT_TETRIMINO_BAG",
  HOLD_TETRIMINO = "HOLD_TETRIMINO",
  MATRIX = "MATRIX",
  SCORE = "SCORE",
  LEVEL = "LEVEL",
  LINE = "LINE",
}

type UpdatePayloads = Array<{ data: any; type: GAME_STATE_TYPE }>;

export default (io: SocketServer, socket: Socket) => {
  const roomId = socket.data.roomId;
  const playerId = socket.data.player.id;

  return async (updatedPayloads: UpdatePayloads) => {
    const scoreUpdateOperationManager =
      scoreUpdateOperationManagerStore.get(roomId);
    try {
      if (!isNil(scoreUpdateOperationManager)) {
        socket.to(roomId).emit("other_game_data_updated", updatedPayloads);
        const scorePayload = updatedPayloads.find(
          (payload) => payload.type === GAME_STATE_TYPE.SCORE
        );
        if (!isNil(scorePayload)) {
          scoreUpdateOperationManager.add(async () => {
            try {
              const room = await roomService.getRoom(roomId);
              if (!isNil(room)) {
                roomService.updateRoom(
                  createNewRoomPlayerScore(room, playerId, scorePayload.data)
                );
              } else {
                throw new Error("room was not found");
              }
            } catch (error) {
              io.in(roomId).emit("error_occur", error);
              logger.error(error);
            }
          });
        }
      } else {
        throw new Error("scoreUpdateOperationManager was not found");
      }
    } catch (error) {
      io.in(roomId).emit("error_occur", error);
      logger.error(error);
    }
  };
};
