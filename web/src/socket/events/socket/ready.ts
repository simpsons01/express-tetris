import type { Server as SocketServer, Socket } from "socket.io";
import type { AnyFunction } from "../../../common/types";
import type { IRoom } from "../../../common/types";
import roomService from "../../../services/room";
import roomTimerStore from "../../stores/roomTimer";
import scoreUpdateOperationManagerStore from "../../stores/scoreUpdateOperationManager";
import {
  pipeCreateNewRoomFn,
  createNewRoomState,
  createNewRoomPlayerToReady,
  checkRoomPlayersAreReady,
  getResult,
  createNewRoomPlayerScoreToZero,
} from "../../../common/room";
import { DEFAULT_BEFORE_GAME_START_LEFT_SEC } from "../../../common/roomTimer";
import {
  verifyCallback,
  EVENT_OPERATION_STATUS,
  createSocketCallbackPayload,
} from "../../../common/socket";
import { isNil } from "ramda";
import { ROOM_STATE } from "../../../common/types";
import { SocketEvents } from "../event";

class ReadyEvent extends SocketEvents {
  constructor(io: SocketServer, socket: Socket) {
    super(io, socket);
    this.handleBeforeStartGame = this.handleBeforeStartGame.bind(this);
    this.handleStartGame = this.handleStartGame.bind(this);
    this.handleEndGame = this.handleEndGame.bind(this);
    this.listener = this.listener.bind(this);
    this.logError = this.logError.bind(this);
    this.logInfo = this.logInfo.bind(this);
    this.onError = this.onError.bind(this);
  }

  handleBeforeStartGame() {
    try {
      const roomTimer = roomTimerStore.get(this.roomId);
      if (isNil(roomTimer)) {
        throw new Error("roomTimer was not found");
      }
      roomTimer.startBeforeGameStartCountDown(
        DEFAULT_BEFORE_GAME_START_LEFT_SEC,
        (leftSec: number) => {
          this._io.in(this.roomId).emit("before_start_game", leftSec);
        },
        () => this.handleStartGame()
      );
    } catch (error) {
      this.onError(error as Error);
    }
  }

  async handleStartGame() {
    try {
      const room = await roomService.getRoom(this.roomId);
      const roomTimer = roomTimerStore.get(this.roomId);
      if (isNil(roomTimer)) {
        throw new Error("roomTimer was not found");
      }
      if (isNil(room)) {
        throw new Error("room was not found");
      }
      roomTimer.clearBeforeGameStartCountDown();
      this._io.in(this.roomId).emit("game_start", room.players);
      roomTimer.startGameEndCountDown(
        this.roomConfig.sec,
        (leftSec: number) => {
          this._io.in(this.roomId).emit("game_leftSec", leftSec);
        },
        () => this.handleEndGame()
      );
    } catch (error) {
      this.onError(error as Error);
    }
  }

  async handleEndGame() {
    try {
      const roomTimer = roomTimerStore.get(this.roomId);
      const scoreUpdateOperationManager = scoreUpdateOperationManagerStore.get(
        this.roomId
      );
      if (isNil(roomTimer)) {
        throw new Error("roomTimer was not found");
      }
      if (isNil(scoreUpdateOperationManager)) {
        throw new Error("scoreUpdateOperationManager was not found");
      }
      roomTimer.clearGameEndCountDown();
      const endGameHandler = async () => {
        try {
          const room = await roomService.getRoom(this.roomId);
          if (isNil(room)) {
            throw new Error("room was not found");
          }
          const result = getResult(room);
          this._io.in(this.roomId).emit("game_over", result);
          this.logInfo(`result is ${JSON.stringify(result)}`);
          await roomService.updateRoom(
            pipeCreateNewRoomFn(
              room,
              (room: IRoom) => createNewRoomState(room, ROOM_STATE.GAME_END),
              (room: IRoom) => createNewRoomPlayerScoreToZero(room)
            )
          );
        } catch (error) {
          this.onError(error as Error);
        }
      };
      if (scoreUpdateOperationManager.isProcessing) {
        scoreUpdateOperationManager.on("clear", async function clearHandler() {
          await endGameHandler();
          scoreUpdateOperationManager.off("clear", clearHandler);
        });
      } else {
        await endGameHandler();
      }
    } catch (error) {
      this.onError(error as Error);
    }
  }

  async listener(callback: AnyFunction | undefined) {
    try {
      const room = await roomService.getRoom(this.roomId);
      if (isNil(room)) {
        throw new Error("room was not found");
      } else if (room.state !== ROOM_STATE.CREATED) {
        throw new Error("room state was not in created");
      }
      const newRoom = createNewRoomPlayerToReady(room, this.player.id);
      if (checkRoomPlayersAreReady(newRoom)) {
        await roomService.updateRoom(
          createNewRoomState(newRoom, ROOM_STATE.GAME_START)
        );
        verifyCallback(callback)(
          createSocketCallbackPayload({
            data: {
              players: newRoom.players,
            },
            metadata: { status: EVENT_OPERATION_STATUS.SUCCESS },
          })
        );
        this.logInfo(`room is about to start game`);
        this.handleBeforeStartGame();
      } else {
        await roomService.updateRoom(newRoom);
        verifyCallback(callback)(
          createSocketCallbackPayload({
            metadata: { status: EVENT_OPERATION_STATUS.SUCCESS },
          })
        );
      }
    } catch (error) {
      this.onError(error as Error);
      verifyCallback(callback)(
        createSocketCallbackPayload({
          metadata: { status: EVENT_OPERATION_STATUS.FAILED },
        })
      );
    }
  }
}

export default ReadyEvent;
