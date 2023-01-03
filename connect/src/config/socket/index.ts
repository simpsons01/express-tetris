import { Server as SocketServer, Socket } from "socket.io";
import * as roomService from "../../services/room";
import * as playerService from "../../services/player";
import * as roomUtils from "../../utils/room";
import * as roomTimerUtils from "../../utils/roomTimer";
import * as playerStoreUtils from "../../utils/playerStore";
import {
  DEFAULT_BEFORE_GAME_START_LEFT_SEC,
  IRoomTimer,
} from "../../utils/roomTimer";
import { IPlayerStore } from "../../utils/playerStore";
import { Server as HttpServer } from "http";
import { AnyFunction, AnyObject } from "../../utils/types";
import { isNil, is, isEmpty } from "ramda";
import { ExtendedError } from "socket.io/dist/namespace";
import { verify as verifyToken } from "../../utils/token";
import { ROOM_STATE } from "../../services/room";

// TODO: 創建socket的options不行是AnyObject
type SocketServerOptions = AnyObject;

type SocketResponsePayload = {
  data: AnyObject;
  metadata: {
    message?: string;
    isSuccess: boolean;
    isError: boolean;
  };
};

const createResponse = (
  data: AnyObject,
  {
    message,
    isSuccess = true,
    isError = false,
  }: { isSuccess?: boolean; isError?: boolean; message?: string } = {}
): SocketResponsePayload => ({
  data: {
    ...(isNil(data) ? {} : data),
  },
  metadata: {
    ...(isNil(message) ? {} : { message }),
    isSuccess,
    isError,
  },
});

const withDone =
  (done: AnyFunction) =>
  (arg: any): void => {
    if (is(Function, done)) done(arg);
  };

class ConnectSocket {
  io: SocketServer;

  constructor(httpServer: HttpServer, options: SocketServerOptions) {
    this.io = new SocketServer(httpServer, options);
    this.io.use(this.authMiddleware.bind(this));
  }

  async authMiddleware(
    socket: Socket,
    next: (err?: ExtendedError | undefined) => void
  ) {
    const token = socket.handshake.auth.token;
    const query = socket.handshake.query;

    if (isNil(token) || isEmpty(token)) {
      return next(new Error("token is required"));
    }

    if (
      isNil(query) ||
      isNil(query.roomId) ||
      isNil(query.playerId) ||
      isNil(query.playerName)
    ) {
      return next(new Error("miss required query"));
    }

    const connectSockets = await this.io.fetchSockets();
    for (const connectSocket of connectSockets) {
      if (query.playerId === connectSocket.data.player.id) {
        next(new Error("already connected"));
        return;
      }
    }

    try {
      const decode = verifyToken(token);
      const player = await playerService.getPlayer(decode.name);
      if (isNil(player)) {
        return next(new Error("auth failed"));
      }
      socket.data.player = player;
    } catch (err) {
      return next(new Error("auth failed"));
    }

    try {
      const room = await roomService.getRoom(query.roomId as string);
      if (isNil(room)) {
        return next(new Error("get room failed"));
      }
      socket.data.room = {
        id: room.id,
        config: room.config,
      };
    } catch (err) {
      return next(new Error("get room failed"));
    }

    next();
  }

  listen(): void {
    this.io.on("connection", (socket) => {
      const roomId = socket.data.room.id;
      const roomConfig = socket.data.room.config;
      const playerId = socket.data.player.id;

      socket.join(roomId);
      const playerStore = playerStoreUtils.hasPlayerStore(roomId)
        ? (playerStoreUtils.getPlayerStore(roomId) as IPlayerStore)
        : playerStoreUtils.createPlayerStore(roomId);
      playerStore.addPlayer(playerId);

      const handleError = (self = true) => {
        if (self) {
          socket.emit("error_occur");
        } else {
          this.io.in(roomId).emit("error_occur");
        }
      };

      const handleBeforeStartGame = () => {
        const roomTimer = roomTimerUtils.hasRoomTimer(roomId)
          ? (roomTimerUtils.getRoomTimer(roomId) as IRoomTimer)
          : roomTimerUtils.createRoomTimer(roomId);
        roomTimer.startBeforeGameStartCountDown(
          DEFAULT_BEFORE_GAME_START_LEFT_SEC,
          (leftSec: number) => {
            this.io.in(roomId).emit("before_start_game", leftSec);
          },
          async () => await handleStartGame()
        );
      };

      const handleStartGame = async () => {
        try {
          const roomTimer = roomTimerUtils.getRoomTimer(roomId);
          if (!isNil(roomTimer)) {
            roomTimer.clearBeforeGameStartCountDown();
            const room = await roomService.getRoom(roomId);
            if (!isNil(room)) {
              await roomService.updateRoom(
                roomUtils.createNewRoomState(room, ROOM_STATE.GAME_START)
              );
              this.io.in(roomId).emit("game_start");
              roomTimer.startGameEndCountDown(
                roomConfig.sec,
                (leftSec: number) => {
                  this.io.in(roomId).emit("game_leftSec", leftSec);
                },
                async () => {
                  await handleEndGame();
                }
              );
            } else {
              handleError(false);
            }
          } else {
            handleError(false);
          }
        } catch (error) {
          handleError(false);
        }
      };

      const handleEndGame = async () => {
        try {
          const roomTimer = roomTimerUtils.getRoomTimer(roomId);
          if (!isNil(roomTimer)) {
            roomTimer.clearGameEndCountDown();
            const room = await roomService.getRoom(roomId);
            if (!isNil(room)) {
              await roomService.updateRoom(
                roomUtils.createNewRoomState(room, ROOM_STATE.GAME_END)
              );
              const playerStore = playerStoreUtils.getPlayerStore(roomId);
              if (!isNil(playerStore)) {
                const result = playerStore.getResult();
                this.io.in(roomId).emit("game_over", result);
                playerStore.resetScore();
              } else {
                handleError(false);
              }
            } else {
              handleError(false);
            }
          } else {
            handleError(false);
          }
        } catch (error) {
          handleError(false);
        }
      };

      socket.on("ready", async (done) => {
        try {
          const room = await roomService.getRoom(roomId);
          if (!isNil(room)) {
            if (room.state === ROOM_STATE.CREATED) {
              const newRoom = roomUtils.createNewRoomPlayerToReady(
                room,
                socket.data.player.id
              );
              await roomService.updateRoom(newRoom);
              withDone(done)(createResponse({}, { isSuccess: true }));
              if (roomUtils.checkRoomPlayersAreReady(newRoom)) {
                handleBeforeStartGame();
              }
            } else {
              handleError();
            }
          } else {
            withDone(done)(createResponse({}, { isSuccess: false }));
            handleError();
          }
        } catch (error) {
          withDone(done)(createResponse({}, { isSuccess: false }));
          handleError();
        }
      });

      socket.on("game_data_updated", async (updatedPayloads) => {
        const playerStore = playerStoreUtils.getPlayerStore(roomId);
        if (!isNil(playerStore)) {
          socket.to(roomId).emit("other_game_data_updated", updatedPayloads);
          const scorePayload = updatedPayloads.find(
            (payload) => payload.type === "SCORE"
          );
          if (!isNil(scorePayload)) {
            playerStore.updateScore(playerId, scorePayload.data);
          }
        } else {
          handleError();
        }
      });

      socket.on("get_room_config", async (done) => {
        withDone(done)(
          createResponse(
            { initialLevel: roomConfig.initialLevel },
            { isSuccess: true }
          )
        );
      });

      socket.on("reset_room", async (done) => {
        try {
          const room = await roomService.getRoom(roomId);
          if (!isNil(room)) {
            if (roomTimerUtils.hasRoomTimer(roomId)) {
              const roomTimer = roomTimerUtils.getRoomTimer(
                roomId
              ) as IRoomTimer;
              roomTimer.clear();
            }
            if (room.state !== ROOM_STATE.CREATED) {
              const _ = roomUtils.createNewRoomState(room, ROOM_STATE.CREATED);
              const newRoom = roomUtils.createNewRoomPlayersToNotReady(_);
              await roomService.updateRoom(newRoom);
            }
            withDone(done)(createResponse({}, { isSuccess: true }));
          } else {
            withDone(done)(createResponse({}, { isSuccess: false }));
            handleError();
          }
        } catch (err) {
          withDone(done)(createResponse({}, { isSuccess: false }));
          handleError();
        }
      });

      socket.on("ping", (cb) => cb());

      socket.on("disconnect", async () => {
        try {
          const room = await roomService.getRoom(roomId);
          if (!isNil(room)) {
            const newRoom = roomUtils.createNewRoomRemovedPlayer(
              room,
              playerId
            );
            const isNewRoomEmpty = roomUtils.checkRoomIsEmpty(newRoom);
            const isHost = room.host.id === playerId;
            if (isNewRoomEmpty || isHost) {
              if (roomTimerUtils.hasRoomTimer(roomId)) {
                const roomTimer = roomTimerUtils.getRoomTimer(
                  roomId
                ) as IRoomTimer;
                roomTimer.clear();
                roomTimerUtils.deleteRoomTimer(roomId);
              }
              if (playerStoreUtils.hasPlayerStore(roomId)) {
                playerStoreUtils.deletePlayerStore(roomId);
              }
              if (isHost) this.io.in(roomId).emit("room_host_leave");
              await roomService.deleteRoom(roomId);
            } else {
              if (room.state === ROOM_STATE.GAME_START) {
                await roomService.updateRoom(
                  roomUtils.createNewRoomState(room, ROOM_STATE.GAME_INTERRUPT)
                );
                if (roomTimerUtils.hasRoomTimer(roomId)) {
                  const roomTimer = roomTimerUtils.getRoomTimer(
                    roomId
                  ) as IRoomTimer;
                  roomTimer.clear();
                }
                if (playerStoreUtils.hasPlayerStore(roomId)) {
                  const playerStore = playerStoreUtils.getPlayerStore(
                    roomId
                  ) as IPlayerStore;
                  playerStore.resetScore();
                }
                this.io.in(roomId).emit("room_participant_leave");
              } else {
                await roomService.updateRoom(newRoom);
              }
            }
          } else {
            handleError(false);
          }
        } catch (error) {
          //
        }
      });
    });
  }
}

let socketInstance: ConnectSocket | undefined;

export default {
  initialize(
    httpServer: HttpServer,
    options: SocketServerOptions
  ): ConnectSocket {
    if (socketInstance === undefined) {
      socketInstance = new ConnectSocket(httpServer, options);
    } else {
      console.warn("tetris game socket service is initialized");
    }
    return socketInstance;
  },
  getInstance(): ConnectSocket | undefined {
    if (socketInstance === undefined) {
      console.warn("tetris game socket service is not initialized");
    }
    return socketInstance;
  },
};
