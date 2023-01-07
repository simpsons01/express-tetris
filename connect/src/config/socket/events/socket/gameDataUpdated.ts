import { Server as SocketServer, Socket } from "socket.io";
import * as playerStoreUtils from "../../../../utils/playerStore";
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

export const gameDataUpdatedEvt = (io: SocketServer, socket: Socket) => {
  const roomId = socket.data.roomId;
  const playerStore = playerStoreUtils.getPlayerStore(roomId);
  const playerId = socket.data.player.id;

  return async (updatedPayloads: UpdatePayloads) => {
    if (!isNil(playerStore)) {
      socket.to(roomId).emit("other_game_data_updated", updatedPayloads);
      const scorePayload = updatedPayloads.find(
        (payload) => payload.type === GAME_STATE_TYPE.SCORE
      );
      if (!isNil(scorePayload)) {
        playerStore.updateScore(playerId, scorePayload.data);
      }
    } else {
      io.in(roomId).emit("error_occur");
    }
  };
};
