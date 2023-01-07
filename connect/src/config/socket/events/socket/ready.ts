import { Server as SocketServer, Socket } from "socket.io";
import { isNil } from "ramda";
import * as roomService from "../../../../services/room";
import * as roomUtils from "../../../../utils/room";
import * as playerStoreUtils from "../../../../utils/playerStore";
import * as roomTimerUtils from "../../../../utils/roomTimer";
import {
  verifyCallback,
  EVENT_OPERATION_STATUS,
  createSocketCallbackPayload,
} from "../../../../utils/socket";
import { AnyFunction } from "../../../../utils/types";

export const readyEvt = (io: SocketServer, socket: Socket) => {
  const roomId = socket.data.roomId;
  const roomConfig = socket.data.roomConfig;
  const roomTimer = roomTimerUtils.getRoomTimer(roomId);
  const playerStore = playerStoreUtils.getPlayerStore(roomId);

  const handleBeforeStartGame = () => {
    if (!isNil(roomTimer)) {
      roomTimer.startBeforeGameStartCountDown(
        roomTimerUtils.DEFAULT_BEFORE_GAME_START_LEFT_SEC,
        (leftSec: number) => {
          io.in(roomId).emit("before_start_game", leftSec);
        },
        handleStartGame
      );
    } else {
      io.in(roomId).emit("error_occur");
    }
  };

  const handleStartGame = () => {
    if (!isNil(roomTimer)) {
      roomTimer.clearBeforeGameStartCountDown();
      io.in(roomId).emit("game_start");
      roomTimer.startGameEndCountDown(
        roomConfig.sec,
        (leftSec: number) => {
          io.in(roomId).emit("game_leftSec", leftSec);
        },
        async () => {
          await handleEndGame();
        }
      );
    } else {
      io.in(roomId).emit("error_occur");
    }
  };

  const handleEndGame = async () => {
    if (!isNil(roomTimer) && !isNil(playerStore)) {
      try {
        roomTimer.clearGameEndCountDown();
        const room = await roomService.getRoom(roomId);
        if (!isNil(room)) {
          await roomService.updateRoom(
            roomUtils.createNewRoomState(room, roomService.ROOM_STATE.GAME_END)
          );
          const result = playerStore.getResult();
          io.in(roomId).emit("game_over", result);
          playerStore.resetScore();
        } else {
          io.in(roomId).emit("error_occur");
        }
      } catch (error) {
        io.in(roomId).emit("error_occur");
      }
    } else {
      io.in(roomId).emit("error_occur");
    }
  };

  return async (callback: AnyFunction | undefined) => {
    try {
      const room = await roomService.getRoom(roomId);
      if (!isNil(room)) {
        if (room.state === roomService.ROOM_STATE.CREATED) {
          const newRoom = roomUtils.createNewRoomPlayerToReady(
            room,
            socket.data.player.id
          );
          if (roomUtils.checkRoomPlayersAreReady(newRoom)) {
            await roomService.updateRoom(
              roomUtils.createNewRoomState(
                newRoom,
                roomService.ROOM_STATE.GAME_START
              )
            );
            verifyCallback(callback)(
              createSocketCallbackPayload({
                metadata: { status: EVENT_OPERATION_STATUS.SUCCESS },
              })
            );
            handleBeforeStartGame();
          } else {
            await roomService.updateRoom(newRoom);
            verifyCallback(callback)(
              createSocketCallbackPayload({
                metadata: { status: EVENT_OPERATION_STATUS.SUCCESS },
              })
            );
          }
        } else {
          socket.emit("error_occur");
        }
      } else {
        verifyCallback(callback)(
          createSocketCallbackPayload({
            metadata: { status: EVENT_OPERATION_STATUS.FAILED },
          })
        );
        socket.emit("error_occur");
      }
    } catch (error) {
      verifyCallback(callback)(
        createSocketCallbackPayload({
          metadata: { status: EVENT_OPERATION_STATUS.FAILED },
        })
      );
      socket.emit("error_occur");
    }
  };
};
