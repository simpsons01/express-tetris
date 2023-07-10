import type { AnyFunction } from "../../../common/types";
import type { Server as SocketServer, Socket } from "socket.io";
import type { IRoom } from "../../../common/types";
import roomService from "../../../services/room";
import roomTimerStore from "../../stores/roomTimer";
import scoreUpdateOperationManagerStore from "../../stores/scoreUpdateOperationManager";
import logger from "../../../config/logger";
import {
  pipeCreateNewRoomFn,
  createNewRoomState,
  createNewRoomPlayerToReady,
  checkRoomPlayersAreReady,
  getResult,
  createNewRoomPlayerScoreToZero,
} from "../../../common/room";
import {
  DEFAULT_BEFORE_GAME_START_LEFT_SEC,
} from "../../../common/roomTimer";
import {
  verifyCallback,
  EVENT_OPERATION_STATUS,
  createSocketCallbackPayload,
} from "../../../common/socket";
import { isNil } from "ramda";
import { ROOM_STATE } from "../../../common/types";

export default (io: SocketServer, socket: Socket) => {
  const roomId = socket.data.roomId;
  const roomConfig = socket.data.roomConfig;

  const onError = (error: unknown) => {
    io.in(roomId).emit("error_occur", error)
    logger.error(error)
  }

  const handleBeforeStartGame = () => {
    try {
      const roomTimer = roomTimerStore.get(roomId);
      if(isNil(roomTimer)) {
        throw new Error("roomTimer was not found");    
      }
      roomTimer.startBeforeGameStartCountDown(
        DEFAULT_BEFORE_GAME_START_LEFT_SEC,
        (leftSec: number) => {
          io.in(roomId).emit("before_start_game", leftSec);
        },
        handleStartGame
      );
    }catch(error) {
      io.in(roomId).emit("error_occur", error)
      logger.error(error)
    }
  };

  const handleStartGame = async () => {
    try {
      const room = await roomService.getRoom(roomId);
      const roomTimer = roomTimerStore.get(roomId);
      if(isNil(roomTimer)) {
        throw new Error("roomTimer was not found");    
      }
      if(isNil(room)) {
        throw new Error("room was not found")
      }
      roomTimer.clearBeforeGameStartCountDown();
      io.in(roomId).emit("game_start", room.players);
      roomTimer.startGameEndCountDown(
        roomConfig.sec,
        (leftSec: number) => {
          io.in(roomId).emit("game_leftSec", leftSec);
        },
        handleEndGame
      )
    }catch(error) {
      onError(error)
    }
  };

  const handleEndGame = async () => {
    try {
      const roomTimer = roomTimerStore.get(roomId);
      const scoreUpdateOperationManager = scoreUpdateOperationManagerStore.get(roomId);
      if(isNil(roomTimer)) {
        throw new Error("roomTimer was not found");    
      }
      if(isNil(scoreUpdateOperationManager)) {
        throw new Error("scoreUpdateOperationManager was not found");
      }
      roomTimer.clearGameEndCountDown();
      const endGameHandler = async () => {
        try {
          const room = await roomService.getRoom(roomId);
          if (!isNil(room)) {
            const result = getResult(room);
            io.in(roomId).emit("game_over", result);
            logger.info(
              `room "${roomId}" end and result is ${JSON.stringify(result)}`
            );
            await roomService.updateRoom(
              pipeCreateNewRoomFn(
                room,
                (room: IRoom) =>
                  createNewRoomState(room, ROOM_STATE.GAME_END),
                (room: IRoom) =>
                  createNewRoomPlayerScoreToZero(room, ROOM_STATE.GAME_END)
              )
            );
          } else {
            throw new Error("room was not found");
          }
        } catch (error) {
          onError(error)
        }
      };
      if (scoreUpdateOperationManager.isProcessing) {
        scoreUpdateOperationManager.on(
          "clear",
          async function clearHandler() {
            await endGameHandler();
            scoreUpdateOperationManager.off("clear", clearHandler);
          }
        );
      } else {
        await endGameHandler();
      }
    }catch(error) {
      onError(error)
    }
  };

  return async (callback: AnyFunction | undefined) => {
    try {
      const room = await roomService.getRoom(roomId);
      if (isNil(room)) {
        throw new Error("room was not found");
      } else if (room.state !== ROOM_STATE.CREATED) {
        throw new Error("room state was not in created");
      }
      const newRoom = createNewRoomPlayerToReady(room, socket.data.player.id);
      if (checkRoomPlayersAreReady(newRoom)) {
        await roomService.updateRoom(
          createNewRoomState(newRoom, ROOM_STATE.GAME_START)
        );
        verifyCallback(callback)(
          createSocketCallbackPayload({
            data: {
              players: newRoom.players
            },
            metadata: { status: EVENT_OPERATION_STATUS.SUCCESS },
          })
        );
        logger.info(`room "${roomId}" is about to start game`);
        handleBeforeStartGame();
      } else {
        await roomService.updateRoom(newRoom);
        verifyCallback(callback)(
          createSocketCallbackPayload({
            metadata: { status: EVENT_OPERATION_STATUS.SUCCESS },
          })
        );
      }
    } catch (error) {
      onError(error)
      verifyCallback(callback)(
        createSocketCallbackPayload({
          metadata: { status: EVENT_OPERATION_STATUS.FAILED },
        })
      );
    }
  };
};
