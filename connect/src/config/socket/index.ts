import { Server as SocketServer } from "socket.io";
import {
  RoomManager,
  ROOM_STATE,
  Participant,
  Room,
} from "../../services/room";
import {
  RoomTimerManager,
  RoomTimer,
  DEFAULT_BEFORE_GAME_START_LEFT_SEC,
  DEFAULT_GAME_END_LEFT_SEC,
} from "../../services/timer";
import { Server as HttpServer } from "http";
import { AnyFunction, AnyObject } from "../../util/types";
import { isNil, is, isEmpty } from "ramda";

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

class GameSocketService {
  io: SocketServer;
  roomManager: RoomManager;
  roomTimerManager: RoomTimerManager;

  constructor(httpServer: HttpServer, options: SocketServerOptions) {
    this.io = new SocketServer(httpServer, options);
  }

  listen(): void {
    this.io.use(async (socket, next) => {
      const allConnectSocket = await this.io.fetchSockets();
      for (const _socket of allConnectSocket) {
        //
      }
      next();
    });
    this.io.on("connection", (socket) => {
      const onLeave = async (room: Room) => {
        const isRoomEmpty = Room.isRoomEmpty(room);
        const isHost = room.host.id === socket.id;
        if (isRoomEmpty || isHost) {
          if (this.roomTimerManager.hasTimer(room.id)) {
            const roomTimer = this.roomTimerManager.getTimer(
              room.id
            ) as RoomTimer;
            roomTimer.clear();
            this.roomTimerManager.deleteTimer(room.id);
          }
          await this.roomManager.deleteRoom(room.id);
          if (!isRoomEmpty) {
            this.io.in(room.id).emit("room_host_leave");
          }
        } else {
          if (
            room.state === ROOM_STATE.GAME_START ||
            room.state === ROOM_STATE.GAME_BEFORE_START
          ) {
            Room.updateState(room, ROOM_STATE.GAME_INTERRUPT);
            await this.roomManager.updateRoom(room.id, room);
            const roomTimer = this.roomTimerManager.getTimer(room.id);
            if (!isNil(roomTimer)) {
              roomTimer.clear();
            }
            this.io.in(room.id).emit("room_participant_leave");
          }
        }
      };

      const onReady = (room: Room) => {
        const roomId = room.id;
        const roomTimer = (() => {
          let _roomTimer: RoomTimer | undefined;
          _roomTimer = this.roomTimerManager.getTimer(roomId);
          if (isNil(_roomTimer)) {
            _roomTimer = this.roomTimerManager.createTimer(roomId);
          }
          return _roomTimer;
        })();
        roomTimer.startBeforeGameStartCountDown(
          DEFAULT_BEFORE_GAME_START_LEFT_SEC,
          (leftSec: number) => {
            this.io.in(roomId).emit("before_start_game", leftSec);
          },
          async () => {
            roomTimer.clearBeforeGameStartCountDown();
            const room = (await this.roomManager.getRoom(roomId)) as Room;
            Room.updateState(room, ROOM_STATE.GAME_START);
            await this.roomManager.updateRoom(roomId, room);
            this.io.in(roomId).emit("game_start");
            roomTimer.startGameEndCountDown(
              DEFAULT_GAME_END_LEFT_SEC,
              (leftSec: number) => {
                this.io.in(roomId).emit("game_leftSec", leftSec);
              },
              async () => {
                const room = (await this.roomManager.getRoom(roomId)) as Room;
                Room.updateState(room, ROOM_STATE.GAME_END);
                this.roomManager.updateRoom(roomId, room);
                roomTimer.clearGameEndCountDown();
                const result = Room.getResult(room);
                this.io.in(room.id).emit("game_over", result);
              }
            );
          }
        );
      };

      socket.on("join_room", async (roomId: string, done) => {
        if (!isEmpty(socket.data.user.name)) {
          const room = await this.roomManager.getRoom(roomId);
          if (!isNil(room)) {
            const participant = new Participant(
              socket.data.user.name,
              socket.id
            );
            Room.addParticipant(room, participant);
            await this.roomManager.updateRoom(roomId, room);
            socket.join(roomId);
            socket.data.user.roomId = roomId;
            withDone(done)(createResponse({}, { isSuccess: true }));
          } else {
            withDone(done)(
              createResponse(
                {},
                { isSuccess: false, message: "ROOM IS NOT EXIST" }
              )
            );
          }
        } else {
          withDone(done)(
            createResponse({}, { isSuccess: false, message: "NAME IS EMPTY" })
          );
        }
      });

      socket.on("ready", async (done) => {
        if (!isEmpty(socket.data.user.roomId)) {
          const room = await this.roomManager.getRoom(socket.data.user.roomId);
          if (!isNil(room)) {
            Room.updateParticipantReady(room, socket.id);
            if (Room.isRoomReady(room)) {
              Room.updateState(room, ROOM_STATE.GAME_BEFORE_START);
              await this.roomManager.updateRoom(room.id, room);
              withDone(done)(createResponse({}, { isSuccess: true }));
              onReady(room);
            } else {
              await this.roomManager.updateRoom(room.id, room);
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
        } else {
          withDone(done)(
            createResponse(
              {},
              { isSuccess: false, message: "IS NOT JOINED ROOM" }
            )
          );
        }
      });

      socket.on("reset_room", async (done) => {
        const roomId = socket.data.user.roomId;
        if (!isEmpty(roomId)) {
          const room = await this.roomManager.getRoom(socket.data.user.roomId);
          if (!isNil(room)) {
            if (
              room.state === ROOM_STATE.GAME_END ||
              room.state === ROOM_STATE.GAME_INTERRUPT
            ) {
              Room.reset(room);
              await this.roomManager.updateRoom(room.id, room);
            }
            withDone(done)(createResponse({}, { isSuccess: true }));
          } else {
            socket.leave(roomId);
            socket.data.user.roomId = "";
            withDone(done)(createResponse({}, { isSuccess: true }));
          }
        } else {
          withDone(done)(
            createResponse(
              {},
              { isSuccess: false, message: "IS NOT JOINED ROOM" }
            )
          );
        }
      });

      socket.on("force_leave_room", (done) => {
        if (!isEmpty(socket.data.user.roomId)) {
          const roomId = socket.data.user.roomId;
          socket.data.user.roomId = "";
          socket.leave(roomId);
        }
        withDone(done)(createResponse({}, { isSuccess: true }));
      });

      socket.on("game_data_updated", async (updatedPayloads) => {
        if (!isEmpty(socket.data.user.roomId)) {
          socket
            .to(socket.data.user.roomId)
            .emit("other_game_data_updated", updatedPayloads);
          const scorePayload = updatedPayloads.find(
            (payload) => payload.type === "SCORE"
          );
          if (!isNil(scorePayload)) {
            const room = await this.roomManager.getRoom(
              socket.data.user.roomId
            );
            if (!isNil(room)) {
              Room.updateParticipantScore(room, socket.id, scorePayload.data);
              await this.roomManager.updateRoom(room.id, room);
            }
          }
        }
      });

      socket.on("disconnect", async () => {
        if (!isEmpty(socket.data.user.roomId)) {
          const room = await this.roomManager.getRoom(socket.data.user.roomId);
          if (!isNil(room)) {
            Room.removeParticipant(room, socket.id);
            await onLeave(room);
          }
        }
      });
    });
  }
}

let gameSocketInstance: GameSocketService | undefined;

export default {
  initialize(
    httpServer: HttpServer,
    options: SocketServerOptions
  ): GameSocketService {
    if (gameSocketInstance === undefined) {
      gameSocketInstance = new GameSocketService(httpServer, options);
    } else {
      console.warn("tetris game socket service is initialized");
    }
    return gameSocketInstance;
  },
  getInstance(): GameSocketService | undefined {
    if (gameSocketInstance === undefined) {
      console.warn("tetris game socket service is not initialized");
    }
    return gameSocketInstance;
  },
};
