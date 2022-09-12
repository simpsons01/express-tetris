import { Server as SocketServer } from "socket.io";
import { RoomManager, ROOM_STATE, Participant, Room } from "./_room";
import {
  RoomTimerManager,
  RoomTimer,
  DEFAULT_BEFORE_GAME_START_LEFT_SEC,
  DEFAULT_GAME_END_LEFT_SEC,
} from "./_timer";
import { Server as HttpServer } from "http";
import { AnyFunction, AnyObject } from "../../../util/types";
import { isNil, is, isEmpty } from "ramda";
import { getIsRedisConnectBrokenError } from "../../redis";

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
    this.roomManager = new RoomManager();
    this.roomTimerManager = new RoomTimerManager();
  }

  listen(): void {
    this.io.use(async (socket, next) => {
      const allConnectSocket = await this.io.fetchSockets();
      for (const _socket of allConnectSocket) {
        if (socket.request.session.id === _socket.data.user.sessionId) {
          next(new Error("already connected"));
          return;
        }
      }
      next();
    });
    this.io.on("connection", (socket) => {
      socket.data.user = {
        sessionId: socket.request.session.id,
        name: socket.request.session.user?.name || "",
        roomId: "",
      };

      const withRedisError =
        <Action extends AnyFunction>(action: Action) =>
        async (...args: Parameters<Action>): Promise<ReturnType<Action>> => {
          try {
            const res = await action(...args);
            return res;
          } catch (error) {
            if (!getIsRedisConnectBrokenError(error)) {
              socket.emit("error_occur");
              if (!isEmpty(socket.data.user.roomId)) {
                this.io.in(socket.data.user.roomId).emit("error_occur");
                socket.leave(socket.data.user.roomId);
                socket.data.user.roomId = "";
              }
            }
            throw error;
          }
        };

      const onLeave = async (room: Room) => {
        const isRoomEmpty = Room.isRoomEmpty(room);
        const isHost = room.host.id === socket.id;
        if (isRoomEmpty || isHost) {
          if (this.roomTimerManager.hasTimer(room.id)) {
            const roomTimer = this.roomTimerManager.getTimer(room.id) as RoomTimer;
            roomTimer.clear();
            this.roomTimerManager.deleteTimer(room.id);
          }
          await this.roomManager.deleteRoom(room.id);
          if (!isRoomEmpty) {
            this.io.in(room.id).emit("room_host_leave");
          }
        } else {
          if (room.state === ROOM_STATE.GAME_START || room.state === ROOM_STATE.GAME_BEFORE_START) {
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
            try {
              roomTimer.clearBeforeGameStartCountDown();
              const room = (await withRedisError(this.roomManager.getRoom.bind(this.roomManager))(
                roomId
              )) as Room;
              Room.updateState(room, ROOM_STATE.GAME_START);
              await withRedisError(this.roomManager.updateRoom.bind(this.roomManager))(roomId, room);
              this.io.in(roomId).emit("game_start");
              roomTimer.startGameEndCountDown(
                DEFAULT_GAME_END_LEFT_SEC,
                (leftSec: number) => {
                  this.io.in(roomId).emit("game_leftSec", leftSec);
                },
                async () => {
                  try {
                    const room = (await withRedisError(this.roomManager.getRoom.bind(this.roomManager))(
                      roomId
                    )) as Room;
                    Room.updateState(room, ROOM_STATE.GAME_END);
                    await withRedisError(this.roomManager.updateRoom.bind(this.roomManager))(roomId, room);
                    roomTimer.clearGameEndCountDown();
                    const result = Room.getResult(room);
                    this.io.in(room.id).emit("game_over", result);
                  } catch (error) {
                    //
                  }
                }
              );
            } catch (error) {
              //
            }
          }
        );
      };

      socket.on("get_socket_data", (done) => {
        const { name, roomId } = socket.data.user;
        withDone(done)(createResponse({ name, roomId }));
      });

      socket.on("set_name", async (name: string, done) => {
        if (isEmpty(socket.data.user.name)) {
          const allConnectSocket = await this.io.fetchSockets();
          for (const _socket of allConnectSocket) {
            if (name === _socket.data.user.name) {
              withDone(done)(createResponse({}, { isSuccess: false, message: "DUPLICATE NAME" }));
            } else {
              if (isNil(socket.request.session.user)) {
                socket.request.session.user = { name: "" };
              }
              socket.request.session.user.name = name;
              socket.request.session.save(function (err) {
                if (err) return withDone(done)(createResponse({}, { isSuccess: false, isError: true }));

                socket.data.user.name = name;
                withDone(done)(createResponse({}, { isSuccess: true }));
              });
            }
          }
        } else {
          withDone(done)(createResponse({}, { isSuccess: false, message: "ALREADY HAS NAME" }));
        }
      });

      socket.on("get_rooms", async (done) => {
        try {
          const rooms = await withRedisError(this.roomManager.getRooms.bind(this.roomManager))();
          withDone(done)(createResponse({ rooms }));
        } catch (error) {
          withDone(done)(createResponse({ rooms: null }, { isSuccess: false, isError: true }));
        }
      });

      socket.on("create_room", async (roomName: string, done) => {
        try {
          if (!isEmpty(socket.data.user.name)) {
            if (isEmpty(socket.data.user.roomId)) {
              const participant = new Participant(socket.data.user.name, socket.id);
              const room = await withRedisError(this.roomManager.createRoom.bind(this.roomManager))(
                roomName,
                participant,
                ROOM_STATE.WAITING_ROOM_FULL
              );
              socket.join(room.id);
              socket.data.user.roomId = room.id;
              this.roomTimerManager.createTimer(room.id);
              withDone(done)(createResponse({ roomId: room.id }));
            } else {
              withDone(done)(
                createResponse({ roomId: null }, { isSuccess: false, message: "ALREADY IN ROOM" })
              );
            }
          } else {
            withDone(done)(createResponse({ roomId: null }, { isSuccess: false, message: "NAME IS EMPTY" }));
          }
        } catch (error) {
          withDone(done)(createResponse({ roomId: null }, { isSuccess: false, isError: true }));
        }
      });

      socket.on("join_room", async (roomId: string, done) => {
        try {
          if (!isEmpty(socket.data.user.name)) {
            const room = await withRedisError(this.roomManager.getRoom.bind(this.roomManager))(roomId);
            if (!isNil(room)) {
              const participant = new Participant(socket.data.user.name, socket.id);
              Room.addParticipant(room, participant);
              await withRedisError(this.roomManager.updateRoom.bind(this.roomManager))(roomId, room);
              socket.join(roomId);
              socket.data.user.roomId = roomId;
              withDone(done)(createResponse({}, { isSuccess: true }));
            } else {
              withDone(done)(createResponse({}, { isSuccess: false, message: "ROOM IS NOT EXIST" }));
            }
          } else {
            withDone(done)(createResponse({}, { isSuccess: false, message: "NAME IS EMPTY" }));
          }
        } catch (error) {
          withDone(done)(createResponse({}, { isSuccess: false, isError: true }));
        }
      });

      socket.on("ready", async (done) => {
        try {
          if (!isEmpty(socket.data.user.roomId)) {
            const room = await withRedisError(this.roomManager.getRoom.bind(this.roomManager))(
              socket.data.user.roomId
            );
            if (!isNil(room)) {
              Room.updateParticipantReady(room, socket.id);
              if (Room.isRoomReady(room)) {
                Room.updateState(room, ROOM_STATE.GAME_BEFORE_START);
                await withRedisError(this.roomManager.updateRoom.bind(this.roomManager))(room.id, room);
                withDone(done)(createResponse({}, { isSuccess: true }));
                onReady(room);
              } else {
                await withRedisError(this.roomManager.updateRoom.bind(this.roomManager))(room.id, room);
                withDone(done)(createResponse({}, { isSuccess: true }));
              }
            } else {
              withDone(done)(createResponse({}, { isSuccess: false, message: "ROOM IS NOT EXIST" }));
            }
          } else {
            withDone(done)(createResponse({}, { isSuccess: false, message: "IS NOT JOINED ROOM" }));
          }
        } catch (error) {
          withDone(done)(createResponse({}, { isSuccess: false, isError: true }));
        }
      });

      socket.on("leave_room", async (done) => {
        try {
          const roomId = socket.data.user.roomId;
          if (!isEmpty(roomId)) {
            const room = await withRedisError(this.roomManager.getRoom.bind(this.roomManager))(
              socket.data.user.roomId
            );
            if (!isNil(room)) {
              Room.removeParticipant(room, socket.id);
              await withRedisError(this.roomManager.updateRoom.bind(this.roomManager))(room.id, room);
              socket.leave(room.id);
              socket.data.user.roomId = "";
              await withRedisError(onLeave)(room);
              withDone(done)(createResponse({}, { isSuccess: true }));
            } else {
              socket.leave(roomId);
              socket.data.user.roomId = "";
              withDone(done)(createResponse({}, { isSuccess: true }));
            }
          } else {
            withDone(done)(createResponse({}, { isSuccess: false, message: "IS NOT JOINED ROOM" }));
          }
        } catch (error) {
          withDone(done)(createResponse({}, { isSuccess: false, isError: true }));
        }
      });

      socket.on("reset_room", async (done) => {
        try {
          const roomId = socket.data.user.roomId;
          if (!isEmpty(roomId)) {
            const room = await withRedisError(this.roomManager.getRoom.bind(this.roomManager))(
              socket.data.user.roomId
            );
            if (!isNil(room)) {
              if (room.state === ROOM_STATE.GAME_END || room.state === ROOM_STATE.GAME_INTERRUPT) {
                Room.reset(room);
                await withRedisError(this.roomManager.updateRoom.bind(this.roomManager))(room.id, room);
              }
              withDone(done)(createResponse({}, { isSuccess: true }));
            } else {
              socket.leave(roomId);
              socket.data.user.roomId = "";
              withDone(done)(createResponse({}, { isSuccess: true }));
            }
          } else {
            withDone(done)(createResponse({}, { isSuccess: false, message: "IS NOT JOINED ROOM" }));
          }
        } catch (error) {
          withDone(done)(createResponse({}, { isSuccess: false, isError: true }));
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
          try {
            socket.to(socket.data.user.roomId).emit("other_game_data_updated", updatedPayloads);
            const scorePayload = updatedPayloads.find((payload) => payload.type === "SCORE");
            if (!isNil(scorePayload)) {
              const room = await withRedisError(this.roomManager.getRoom.bind(this.roomManager))(
                socket.data.user.roomId
              );
              if (!isNil(room)) {
                Room.updateParticipantScore(room, socket.id, scorePayload.data);
                await withRedisError(this.roomManager.updateRoom.bind(this.roomManager))(room.id, room);
              }
            }
          } catch (error) {
            //
          }
        }
      });

      socket.on("disconnect", async () => {
        try {
          if (!isEmpty(socket.data.user.roomId)) {
            const room = await withRedisError(this.roomManager.getRoom.bind(this.roomManager))(
              socket.data.user.roomId
            );
            if (!isNil(room)) {
              Room.removeParticipant(room, socket.id);
              await withRedisError(onLeave)(room);
            }
          }
        } catch (error) {
          //
        }
      });
    });
  }
}

let gameSocketInstance: GameSocketService | undefined;

export default {
  initialize(httpServer: HttpServer, options: SocketServerOptions): GameSocketService {
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
