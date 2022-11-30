import { Server as SocketServer, Socket } from "socket.io";
import {
  createRoom,
  hasRoom,
  deleteRoom,
  getRoom,
  IRoom,
  ROOM_STATE,
} from "../../utils/room";
import { createPlayer } from "../../utils/player";
import {
  getRoomTimer,
  createRoomTimer,
  DEFAULT_BEFORE_GAME_START_LEFT_SEC,
  DEFAULT_GAME_END_LEFT_SEC,
} from "../../utils/roomTimer";
import * as authService from "../../services/auth";
import * as roomService from "../../services/room";
import { Server as HttpServer } from "http";
import { AnyFunction, AnyObject } from "../../utils/types";
import { isNil, is, isEmpty } from "ramda";
import { ExtendedError } from "socket.io/dist/namespace";

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

class GameSocket {
  io: SocketServer;

  constructor(httpServer: HttpServer, options: SocketServerOptions) {
    this.io = new SocketServer(httpServer, options);
    this.io.use(this.authMiddleware);
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
    try {
      await authService.checkAuth(token);
    } catch (err) {
      return next(new Error("auth failed"));
    }
    const connectSockets = await this.io.fetchSockets();
    for (const connectSocket of connectSockets) {
      if (query.playerId === connectSocket.data.user.player.id) {
        return next(new Error("already connected"));
      }
    }
    try {
      const {
        data: { room },
      } = await roomService.getRoom(query.roomId as string);
      socket.data = {
        room: {
          id: query.roomId,
          config: room.config,
        },
        player: {
          name: query.playerName,
          id: query.playerId,
        },
      };
      next();
    } catch (err) {
      next(new Error("get room failed"));
    }
  }

  listen(): void {
    this.io.on("connection", (socket) => {
      const player = createPlayer(
        socket.data.player.name,
        socket.data.player.id
      );
      if (hasRoom(socket.data.roomId)) {
        const room = getRoom(socket.data.roomId) as IRoom;
        room.addPlayer(player);
      } else {
        createRoom(socket.data.roomId, {
          hostId: player.id,
          config: socket.data.room.config,
          players: [player],
        });
      }
      socket.join(socket.data.room.id);

      socket.on("ready", (done) => {
        const roomId = socket.data.user.roomId;
        const room = getRoom(socket.data.user.roomId);
        if (!isNil(room)) {
          room.updatePlayerToReady(socket.data.player.id);
          if (room.isRoomReady()) {
            room.updateState(ROOM_STATE.GAME_BEFORE_START);
            withDone(done)(createResponse({}, { isSuccess: true }));
            const roomTimer = (() => {
              let _roomTimer = getRoomTimer(roomId);
              if (isNil(_roomTimer)) {
                _roomTimer = createRoomTimer(roomId);
              }
              return _roomTimer;
            })();
            roomTimer.startBeforeGameStartCountDown(
              DEFAULT_BEFORE_GAME_START_LEFT_SEC,
              (leftSec: number) => {
                this.io.in(roomId).emit("before_start_game", leftSec);
              },
              () => {
                roomTimer.clearBeforeGameStartCountDown();
                room.updateState(ROOM_STATE.GAME_START);
                this.io.in(roomId).emit("game_start");
                roomTimer.startGameEndCountDown(
                  DEFAULT_GAME_END_LEFT_SEC,
                  (leftSec: number) => {
                    this.io.in(roomId).emit("game_leftSec", leftSec);
                  },
                  () => {
                    room.updateState(ROOM_STATE.GAME_END);
                    roomTimer.clearGameEndCountDown();
                    const result = room.getResult();
                    this.io.in(roomId).emit("game_over", result);
                  }
                );
              }
            );
          } else {
            withDone(done)(createResponse({}, { isSuccess: true }));
          }
        } else {
          withDone(done)(
            createResponse(
              {},
              { isSuccess: false, message: "ROOM IS NOT EXIST" }
            )
          );
        }
      });
      // const onLeave = async (room: Room) => {
      //   const isRoomEmpty = Room.isRoomEmpty(room);
      //   const isHost = room.host.id === socket.id;
      //   if (isRoomEmpty || isHost) {
      //     if (this.roomTimerManager.hasTimer(room.id)) {
      //       const roomTimer = this.roomTimerManager.getTimer(
      //         room.id
      //       ) as RoomTimer;
      //       roomTimer.clear();
      //       this.roomTimerManager.deleteTimer(room.id);
      //     }
      //     await this.roomManager.deleteRoom(room.id);
      //     if (!isRoomEmpty) {
      //       this.io.in(room.id).emit("room_host_leave");
      //     }
      //   } else {
      //     if (
      //       room.state === ROOM_STATE.GAME_START ||
      //       room.state === ROOM_STATE.GAME_BEFORE_START
      //     ) {
      //       Room.updateState(room, ROOM_STATE.GAME_INTERRUPT);
      //       await this.roomManager.updateRoom(room.id, room);
      //       const roomTimer = this.roomTimerManager.getTimer(room.id);
      //       if (!isNil(roomTimer)) {
      //         roomTimer.clear();
      //       }
      //       this.io.in(room.id).emit("room_participant_leave");
      //     }
      //   }
      // };
      // const onReady = (room: Room) => {
      //   const roomId = room.id;
      //   const roomTimer = (() => {
      //     let _roomTimer: RoomTimer | undefined;
      //     _roomTimer = this.roomTimerManager.getTimer(roomId);
      //     if (isNil(_roomTimer)) {
      //       _roomTimer = this.roomTimerManager.createTimer(roomId);
      //     }
      //     return _roomTimer;
      //   })();
      //   roomTimer.startBeforeGameStartCountDown(
      //     DEFAULT_BEFORE_GAME_START_LEFT_SEC,
      //     (leftSec: number) => {
      //       this.io.in(roomId).emit("before_start_game", leftSec);
      //     },
      //     async () => {
      //       roomTimer.clearBeforeGameStartCountDown();
      //       const room = (await this.roomManager.getRoom(roomId)) as Room;
      //       Room.updateState(room, ROOM_STATE.GAME_START);
      //       await this.roomManager.updateRoom(roomId, room);
      //       this.io.in(roomId).emit("game_start");
      //       roomTimer.startGameEndCountDown(
      //         DEFAULT_GAME_END_LEFT_SEC,
      //         (leftSec: number) => {
      //           this.io.in(roomId).emit("game_leftSec", leftSec);
      //         },
      //         async () => {
      //           const room = (await this.roomManager.getRoom(roomId)) as Room;
      //           Room.updateState(room, ROOM_STATE.GAME_END);
      //           this.roomManager.updateRoom(roomId, room);
      //           roomTimer.clearGameEndCountDown();
      //           const result = Room.getResult(room);
      //           this.io.in(room.id).emit("game_over", result);
      //         }
      //       );
      //     }
      //   );
      // };
      // socket.on("reset_room", async (done) => {
      //   const roomId = socket.data.user.roomId;
      //   if (!isEmpty(roomId)) {
      //     const room = await this.roomManager.getRoom(socket.data.user.roomId);
      //     if (!isNil(room)) {
      //       if (
      //         room.state === ROOM_STATE.GAME_END ||
      //         room.state === ROOM_STATE.GAME_INTERRUPT
      //       ) {
      //         Room.reset(room);
      //         await this.roomManager.updateRoom(room.id, room);
      //       }
      //       withDone(done)(createResponse({}, { isSuccess: true }));
      //     } else {
      //       socket.leave(roomId);
      //       socket.data.user.roomId = "";
      //       withDone(done)(createResponse({}, { isSuccess: true }));
      //     }
      //   } else {
      //     withDone(done)(
      //       createResponse(
      //         {},
      //         { isSuccess: false, message: "IS NOT JOINED ROOM" }
      //       )
      //     );
      //   }
      // });
      // socket.on("force_leave_room", (done) => {
      //   if (!isEmpty(socket.data.user.roomId)) {
      //     const roomId = socket.data.user.roomId;
      //     socket.data.user.roomId = "";
      //     socket.leave(roomId);
      //   }
      //   withDone(done)(createResponse({}, { isSuccess: true }));
      // });
      // socket.on("game_data_updated", async (updatedPayloads) => {
      //   if (!isEmpty(socket.data.user.roomId)) {
      //     socket
      //       .to(socket.data.user.roomId)
      //       .emit("other_game_data_updated", updatedPayloads);
      //     const scorePayload = updatedPayloads.find(
      //       (payload) => payload.type === "SCORE"
      //     );
      //     if (!isNil(scorePayload)) {
      //       const room = await this.roomManager.getRoom(
      //         socket.data.user.roomId
      //       );
      //       if (!isNil(room)) {
      //         Room.updateParticipantScore(room, socket.id, scorePayload.data);
      //         await this.roomManager.updateRoom(room.id, room);
      //       }
      //     }
      //   }
      // });
      // socket.on("disconnect", async () => {
      //   if (!isEmpty(socket.data.user.roomId)) {
      //     const room = await this.roomManager.getRoom(socket.data.user.roomId);
      //     if (!isNil(room)) {
      //       Room.removeParticipant(room, socket.id);
      //       await onLeave(room);
      //     }
      //   }
      // });
    });
  }
}

let gameSocketInstance: GameSocket | undefined;

export default {
  initialize(httpServer: HttpServer, options: SocketServerOptions): GameSocket {
    if (gameSocketInstance === undefined) {
      gameSocketInstance = new GameSocket(httpServer, options);
    } else {
      console.warn("tetris game socket service is initialized");
    }
    return gameSocketInstance;
  },
  getInstance(): GameSocket | undefined {
    if (gameSocketInstance === undefined) {
      console.warn("tetris game socket service is not initialized");
    }
    return gameSocketInstance;
  },
};
