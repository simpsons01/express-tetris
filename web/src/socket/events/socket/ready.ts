import type { AnyFunction } from "../../../utils/types";
import type { Server as SocketServer, Socket } from "socket.io";
import type { IRoom } from "../../../utils/types";
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
} from "../../../utils/room";
import {
  DEFAULT_BEFORE_GAME_START_LEFT_SEC,
  RoomTimer,
} from "../../../utils/roomTimer";
import {
  verifyCallback,
  EVENT_OPERATION_STATUS,
  createSocketCallbackPayload,
} from "../../../utils/socket";
import { isNil } from "ramda";
import ScoreUpdateOperationManager from "../../../utils/scoreUpdateOperationManager";
import { ROOM_STATE } from "../../../utils/types";

export default (io: SocketServer, socket: Socket) => {
  const roomId = socket.data.roomId;
  const roomConfig = socket.data.roomConfig;

  return async (callback: AnyFunction | undefined) => {
    let room: IRoom | null | undefined,
      scoreUpdateOperationManager: ScoreUpdateOperationManager | undefined,
      roomTimer: RoomTimer | undefined;

    try {
      room = await roomService.getRoom(roomId);
      if (isNil(room)) {
        throw new Error("room was not found");
      } else if (room.state !== ROOM_STATE.CREATED) {
        throw new Error("room state was not in created");
      }
      scoreUpdateOperationManager =
        scoreUpdateOperationManagerStore.get(roomId);
      if (isNil(scoreUpdateOperationManager)) {
        throw new Error("scoreUpdateOperationManager was not found");
      }

      roomTimer = roomTimerStore.get(roomId);
      if (isNil(roomTimer)) {
        throw new Error("roomTimer was not found");
      }

      const handleBeforeStartGame = () => {
        (roomTimer as RoomTimer).startBeforeGameStartCountDown(
          DEFAULT_BEFORE_GAME_START_LEFT_SEC,
          (leftSec: number) => {
            io.in(roomId).emit("before_start_game", leftSec);
          },
          handleStartGame
        );
      };

      const handleStartGame = () => {
        (roomTimer as RoomTimer).clearBeforeGameStartCountDown();
        io.in(roomId).emit("game_start");
        (roomTimer as RoomTimer).startGameEndCountDown(
          roomConfig.sec,
          (leftSec: number) => {
            io.in(roomId).emit("game_leftSec", leftSec);
          },
          handleEndGame
        );
      };

      const handleEndGame = async () => {
        (roomTimer as RoomTimer).clearGameEndCountDown();
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
            logger.error(error);
            io.in(roomId).emit("error_occur");
          }
        };
        const _scoreUpdateOperationManager =
          scoreUpdateOperationManager as ScoreUpdateOperationManager;
        if (_scoreUpdateOperationManager.isProcessing) {
          _scoreUpdateOperationManager.on(
            "clear",
            async function clearHandler() {
              await endGameHandler();
              _scoreUpdateOperationManager.off("clear", clearHandler);
            }
          );
        } else {
          await endGameHandler();
        }
      };

      const newRoom = createNewRoomPlayerToReady(room, socket.data.player.id);
      if (checkRoomPlayersAreReady(newRoom)) {
        await roomService.updateRoom(
          createNewRoomState(newRoom, ROOM_STATE.GAME_START)
        );
        verifyCallback(callback)(
          createSocketCallbackPayload({
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
      logger.error(error);
      verifyCallback(callback)(
        createSocketCallbackPayload({
          metadata: { status: EVENT_OPERATION_STATUS.FAILED },
        })
      );
      socket.emit("error_occur");
    }
  };
};
