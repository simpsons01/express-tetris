import { delay, logger } from "../../../util";
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

// TODO: 創建socket的options不行是AnyObject
export type SocketServerOptions = AnyObject;

export type SocketResponsePayload = {
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
            this.io.in(room.id).emit("game_interrupted");
          }
        }
      };

      const onReady = (room: Room) => {
        const roomTimer = (() => {
          let _roomTimer: RoomTimer | undefined;
          _roomTimer = this.roomTimerManager.getTimer(room.id);
          if (isNil(_roomTimer)) {
            _roomTimer = this.roomTimerManager.createTimer(room.id);
          }
          return _roomTimer;
        })();
        roomTimer.startBeforeGameStartCountDown(
          DEFAULT_BEFORE_GAME_START_LEFT_SEC,
          (leftSec: number) => {
            this.io.in(room.id).emit("before_start_game", leftSec);
          },
          () => {
            withRedisError(async () => {
              roomTimer.clearBeforeGameStartCountDown();
              Room.updateState(room, ROOM_STATE.GAME_START);
              await this.roomManager.updateRoom(room.id, room);
              this.io.in(room.id).emit("game_start");
              roomTimer.startGameEndCountDown(
                DEFAULT_GAME_END_LEFT_SEC,
                (leftSec: number) => {
                  this.io.in(room.id).emit("game_leftSec", leftSec);
                },
                () => {
                  withRedisError(async () => {
                    Room.updateState(room, ROOM_STATE.GAME_END);
                    await this.roomManager.updateRoom(room.id, room);
                    roomTimer.clearGameEndCountDown();
                    const result = Room.getResult(room);
                    this.io.in(room.id).emit("game_over", result);
                  })({ roomId: room.id });
                }
              );
            })({ roomId: room.id });
          }
        );
      };

      const withRedisError =
        (action: AnyFunction, onError?: AnyFunction) =>
        async ({ roomId = "", shouldNotify = true } = {}): Promise<void> => {
          try {
            await action();
          } catch (error) {
            console.log(error);
            if (is(Function, onError)) onError();
            if (shouldNotify) {
              if (!isEmpty(roomId)) {
                this.io.in(roomId).emit("error_occur");
              } else {
                socket.emit("error_occur");
              }
            }
          }
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
              withDone(done)(
                createResponse(
                  {},
                  { isSuccess: false, message: "DUPLICATE NAME" }
                )
              );
            } else {
              if (isNil(socket.request.session.user)) {
                socket.request.session.user = { name: "" };
              }
              socket.request.session.user.name = name;
              socket.request.session.save(function (err) {
                if (err)
                  return withDone(done)(
                    createResponse({}, { isSuccess: false, isError: true })
                  );

                socket.data.user.name = name;
                withDone(done)(createResponse({}, { isSuccess: true }));
              });
            }
          }
        } else {
          withDone(done)(createResponse({}, { isSuccess: false }));
        }
      });

      socket.on("get_rooms", async (done) => {
        withRedisError(
          async () => {
            const rooms = await this.roomManager.getRooms();
            withDone(done)(createResponse({ rooms }));
          },
          () => {
            withDone(done)(
              createResponse(
                { rooms: null },
                { isSuccess: false, isError: true }
              )
            );
          }
        )();
      });

      socket.on("create_room", async (roomName: string, done) => {
        if (!isEmpty(socket.data.user.name)) {
          withRedisError(
            async () => {
              if (isEmpty(socket.data.user.roomId)) {
                const participant = new Participant(
                  socket.data.user.name,
                  socket.id
                );
                const room = await this.roomManager.createRoom(
                  roomName,
                  participant
                );
                Room.updateState(room, ROOM_STATE.WAITING_ROOM_FULL);
                await this.roomManager.updateRoom(room.id, room);
                socket.join(room.id);
                socket.data.user.roomId = room.id;
                this.roomTimerManager.createTimer(room.id);
                withDone(done)(createResponse({ roomId: room.id }));
              } else {
                withDone(done)(
                  createResponse(
                    { roomId: null },
                    { isSuccess: false, message: "USER IS IN SOME ROOM" }
                  )
                );
              }
            },
            () => {
              withDone(done)(
                createResponse(
                  { roomId: null },
                  { isSuccess: false, isError: true }
                )
              );
            }
          )();
        } else {
          createResponse(
            { roomId: null },
            { isSuccess: false, message: "NAME REQUIRED" }
          );
        }
      });

      socket.on("join_room", async (roomId: string, done) => {
        console.log(
          "participant is trying to join game! and participant id is  ",
          socket.id
        );
        if (!isEmpty(socket.data.user.name)) {
          withRedisError(
            async () => {
              const room = await this.roomManager.getRoom(roomId);
              if (!isNil(room)) {
                const participant = new Participant(
                  socket.data.user.name,
                  socket.id
                );
                Room.addParticipant(room, participant);
                await this.roomManager.updateRoom(roomId, room);
                // join self to room
                socket.join(roomId);
                socket.data.user.roomId = roomId;
                withDone(done)(createResponse({}, { isSuccess: true }));
              } else {
                withDone(done)(createResponse({}, { isSuccess: false }));
              }
            },
            () => {
              withDone(done)(
                createResponse({}, { isSuccess: false, isError: true })
              );
            }
          )();
        } else {
          withDone(done)(createResponse({}, { isSuccess: false }));
        }
      });

      socket.on("ready", async (done) => {
        if (!isEmpty(socket.data.user.roomId)) {
          withRedisError(
            async () => {
              const room = await this.roomManager.getRoom(
                socket.data.user.roomId
              );
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
                withDone(done)(createResponse({}, { isSuccess: false }));
              }
            },
            () => {
              withDone(done)(
                createResponse({}, { isSuccess: false, isError: true })
              );
            }
          )({ roomId: socket.data.user.roomId });
        } else {
          withDone(done)(createResponse({}, { isSuccess: false }));
        }
      });

      socket.on("leave_room", (done) => {
        const roomId = socket.data.user.roomId;
        if (!isEmpty(roomId)) {
          withRedisError(
            async () => {
              const room = await this.roomManager.getRoom(
                socket.data.user.roomId
              );
              if (!isNil(room)) {
                Room.removeParticipant(room, socket.id);
                await this.roomManager.updateRoom(room.id, room);
                socket.leave(room.id);
                socket.data.user.roomId = "";
                await onLeave(room);
                withDone(done)(createResponse({}, { isSuccess: true }));
              } else {
                socket.leave(roomId);
                socket.data.user.roomId = "";
                withDone(done)(createResponse({}, { isSuccess: true }));
              }
            },
            () => {
              withDone(done)(
                createResponse({}, { isSuccess: false, isError: true })
              );
            }
          )({ roomId });
        } else {
          withDone(done)(createResponse({}, { isSuccess: false }));
        }
      });

      socket.on("reset_room", (done) => {
        const roomId = socket.data.user.roomId;
        if (!isEmpty(roomId)) {
          withRedisError(
            async () => {
              const room = await this.roomManager.getRoom(
                socket.data.user.roomId
              );
              if (!isNil(room)) {
                if (
                  room.state === ROOM_STATE.GAME_END ||
                  room.state === ROOM_STATE.GAME_INTERRUPT
                ) {
                  Room.reset(room);
                  await this.roomManager.updateRoom(room.id, room);
                }
                withDone(done)(createResponse({}, { isSuccess: true }));
              }
            },
            () => {
              withDone(done)(
                createResponse({}, { isSuccess: false, isError: true })
              );
            }
          )({ roomId });
        } else {
          withDone(done)(createResponse({}, { isSuccess: false }));
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

      socket.on("game_data_updated", (updatedQueue) => {
        if (socket.data.user.roomId) {
          socket
            .to(socket.data.user.roomId)
            .emit("other_game_data_updated", updatedQueue);
          updatedQueue.forEach(async (item) => {
            if (item.type === "SCORE") {
              withRedisError(async () => {
                const room = await this.roomManager.getRoom(
                  socket.data.user.roomId
                );
                if (!isNil(room)) {
                  Room.updateParticipantScore(room, socket.id, item.data);
                  await this.roomManager.updateRoom(room.id, room);
                }
              })({ roomId: socket.data.user.roomId });
            }
          });
        }
      });

      socket.on("disconnect", async () => {
        await withRedisError(async () => {
          const room = await this.roomManager.getRoom(socket.data.user.roomId);
          if (!isNil(room)) {
            Room.removeParticipant(room, socket.id);
            await this.roomManager.updateRoom(room.id, room);
            await withRedisError(async () => {
              await onLeave(room);
            })({ roomId: room.id });
          }
        })({ shouldNotify: false });
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
      logger.warn("tetris game socket service is initialized");
    }
    return gameSocketInstance;
  },
  getInstance(): GameSocketService | undefined {
    if (gameSocketInstance === undefined) {
      logger.warn("tetris game socket service is not initialized");
    }
    return gameSocketInstance;
  },
};
