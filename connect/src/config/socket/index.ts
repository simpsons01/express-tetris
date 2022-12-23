import { hasRoomTimer, IRoomTimer } from "./../../utils/roomTimer";
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
  deleteRoomTimer,
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
      await authService.checkAuth(token);
    } catch (err) {
      return next(new Error("auth failed"));
    }
    try {
      const { data: room } = await roomService.getRoom(query.roomId as string);
      socket.data = {
        room,
        player: {
          name: query.playerName,
          id: query.playerId,
        },
      };
    } catch (err) {
      return next(new Error("get room Failed failed"));
    }

    next();
  }

  listen(): void {
    this.io.on("connection", (socket) => {
      const player = createPlayer(
        socket.data.player.name,
        socket.data.player.id
      );
      if (hasRoom(socket.data.room.id)) {
        const room = getRoom(socket.data.room.id) as IRoom;
        room.addPlayer(player);
      } else {
        createRoom(socket.data.room.id, {
          hostId: player.id,
          config: socket.data.room.config,
          players: [player],
        });
      }
      socket.join(socket.data.room.id);

      const startGame = (room: IRoom, roomId: string) => {
        room.updateState(ROOM_STATE.GAME_BEFORE_START);
        const roomTimer = hasRoomTimer(roomId)
          ? (getRoomTimer(roomId) as IRoomTimer)
          : createRoomTimer(roomId);
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
              room.config.sec,
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
      };

      socket.on("ready", (done) => {
        const roomId = socket.data.room.id;
        const room = getRoom(roomId);
        if (!isNil(room)) {
          if (room.state === ROOM_STATE.CREATED) {
            room.updatePlayerToReady(socket.data.player.id);
            withDone(done)(createResponse({}, { isSuccess: true }));
            if (room.isRoomReady()) startGame(room, roomId);
          } else {
            socket.emit("error_occur");
          }
        } else {
          withDone(done)(
            createResponse(
              {},
              { isSuccess: false, message: "ROOM IS NOT EXIST" }
            )
          );
          socket.emit("error_occur");
        }
      });

      socket.on("game_data_updated", async (updatedPayloads) => {
        const roomId = socket.data.room.id;
        const playerId = socket.data.player.id;
        const room = getRoom(roomId);
        if (!isNil(room)) {
          socket.to(roomId).emit("other_game_data_updated", updatedPayloads);
          const scorePayload = updatedPayloads.find(
            (payload) => payload.type === "SCORE"
          );
          if (!isNil(scorePayload)) {
            room.updatePlayerScore(playerId, scorePayload.data);
          }
        } else {
          socket.emit("error_occur");
        }
      });

      socket.on("get_room_config", async (done) => {
        const roomId = socket.data.room.id;
        const room = getRoom(roomId);
        if (!isNil(room)) {
          withDone(done)(
            createResponse(
              { initialLevel: room.config.initialLevel },
              { isSuccess: true }
            )
          );
        } else {
          withDone(done)(createResponse({}, { isSuccess: false }));
          socket.emit("error_occur");
        }
      });

      socket.on("ping", (cb) => cb());

      socket.on("reset_room", async (done) => {
        const roomId = socket.data.room.id;
        try {
          await roomService.getRoom(roomId);
          const room = getRoom(roomId);
          if (!isNil(room)) {
            if (hasRoomTimer(roomId)) {
              const roomTimer = getRoomTimer(roomId) as IRoomTimer;
              roomTimer.clear();
              deleteRoomTimer(roomId);
            }
            if (room.state !== ROOM_STATE.CREATED) {
              room.updateState(ROOM_STATE.CREATED);
              room.reset();
            }
            withDone(done)(createResponse({}, { isSuccess: true }));
          } else {
            withDone(done)(createResponse({}, { isSuccess: false }));
            socket.emit("error_occur");
          }
        } catch (err) {
          console.log(err);
          socket.emit("error_occur");
        }
      });

      socket.on("disconnect", async () => {
        const roomId = socket.data.room.id;
        const playerId = socket.data.player.id;
        const room = getRoom(roomId);
        if (!isNil(room)) {
          room.removePlayer(playerId);
          const isRoomEmpty = room.isRoomEmpty();
          const isHost = room.hostId === playerId;
          if (isRoomEmpty || isHost) {
            if (hasRoomTimer(roomId)) {
              const roomTimer = getRoomTimer(roomId) as IRoomTimer;
              roomTimer.clear();
              deleteRoomTimer(roomId);
            }
            deleteRoom(roomId);
            if (isHost) this.io.in(roomId).emit("room_host_leave");
          } else {
            if (
              room.state === ROOM_STATE.GAME_START ||
              room.state === ROOM_STATE.GAME_BEFORE_START
            ) {
              room.updateState(ROOM_STATE.GAME_INTERRUPT);
              if (hasRoomTimer(roomId)) {
                const roomTimer = getRoomTimer(roomId) as IRoomTimer;
                roomTimer.clear();
              }
              this.io.in(roomId).emit("room_participant_leave");
            }
          }
        }
        try {
          await roomService.removePlayerFromRoom({
            roomId,
            playerName: socket.data.player.name,
          });
        } catch (err) {
          console.log(err);
        }
      });
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
