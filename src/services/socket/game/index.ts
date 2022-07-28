import { delay, logger } from "../../../util";
import { RemoteSocket, Server as SocketServer } from "socket.io";
import { createRoomStore, IRoomStore, createParticipant, ROOM_STATE } from "./_room";
import { Server as HttpServer } from "http";
import { AnyObject, SessionUser } from "../../../util/types";
import { isEmpty, isNil } from "ramda";

// TODO: 創建socket的options不行是AnyObject
export type SocketServerOptions = AnyObject;

const dummyHandleError = (error: Error) => {
  throw error;
};

class GameSocketService {
  io: SocketServer;
  roomStore: IRoomStore;
  waitList: Array<string> = [];

  constructor(httpServer: HttpServer, options: SocketServerOptions) {
    this.io = new SocketServer(httpServer, options);
    this.roomStore = createRoomStore();
  }

  listen(): void {
    this.io.use(async (socket, next) => {
      if (isNil(socket.request.session.user)) {
        next(new Error("not auth"));
        return;
      }
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
      const timer = setInterval(() => {
        socket.request.session.reload((err) => {
          if (err) return dummyHandleError(new Error("oops"));
          if (isNil(socket.request.session.user)) {
            return socket.disconnect();
          }
        });
      }, 3000);
      socket.data.user = {
        sessionId: socket.request.session.id,
        name: (socket.request.session.user as SessionUser).name,
        roomId: "",
      };

      socket.on("try_join_game", async (done) => {
        console.log("participant is trying to join game! and participant id is  ", socket.id);
        try {
          let notInGameSocket: RemoteSocket<AnyObject, AnyObject> | undefined;
          const allConnectSocket = await this.io.fetchSockets();
          for (const _socket of allConnectSocket) {
            if (isEmpty(_socket.data.user.roomId) && _socket.id !== socket.id) {
              notInGameSocket = _socket;
            }
            if (!isNil(notInGameSocket)) break;
          }
          if (isNil(notInGameSocket)) {
            done(false);
          } else {
            // create room
            const room = this.roomStore.createRoom();
            // join self to room
            socket.join(room.id);
            socket.data.user.roomId = room.id;
            const selfParticipant = createParticipant(socket.data.user.name, socket.id);
            room.addParticipant(selfParticipant);
            // join other to room
            notInGameSocket.join(room.id);
            notInGameSocket.data.user.roomId = room.id;
            const otherParticipant = createParticipant(
              notInGameSocket.data.user.name,
              notInGameSocket.id
            );
            room.addParticipant(otherParticipant);
            // notify_client_join_game
            socket.emit("join_game");
            this.io.to(notInGameSocket.id).emit("join_game");
            done(true);
          }
        } catch (err) {
          dummyHandleError(new Error("oops"));
        }
      });

      socket.on("ready", async (done) => {
        console.log("participant is ready to play! and participant id is  ", socket.id);
        const room = this.roomStore.findRoom(socket.data.user.roomId);
        if (!isNil(room)) {
          room.updateParticipantReady(socket.id);
          if (room.isRoomReady()) {
            done(true);
            await delay(1);
            if (room.state !== ROOM_STATE.GAME_START) {
              room.startBeforeGameStartCountDown(
                (leftSec: number) => {
                  this.io.to(socket.data.user.roomId).emit("before_start_game", leftSec);
                },
                () => {
                  room.setState(ROOM_STATE.GAME_START);
                  room.startCountDown(
                    (leftSec: number) => {
                      this.io.to(socket.data.user.roomId).emit("game_leftSec", leftSec);
                    },
                    () => {
                      room.setState(ROOM_STATE.GAME_END);
                      const result = room.getResult();
                      this.io.to(socket.data.user.roomId).emit("game_over", result);
                    }
                  );
                }
              );
            }
          } else {
            done(false);
          }
        } else {
          socket.data.user.roomId = "";
          done(false);
        }
      });

      socket.on("leave_game", () => {
        console.log("participant leave game! and participant id is  ", socket.id);
        if (!isEmpty(socket.data.user.roomId)) {
          const roomId = socket.data.user.roomId;
          socket.leave(roomId);
          socket.data.user.roomId = "";
          const room = this.roomStore.findRoom(roomId);
          if (!isNil(room)) {
            room.stopCountDown();
            room.removeParticipant(socket.id);
            if (room.isRoomEmpty()) {
              this.roomStore.removeRoom(room.id);
            } else {
              if (room.state === ROOM_STATE.GAME_START) {
                room.stopCountDown();
                room.setState(ROOM_STATE.GAME_INTERRUPT);
                this.io.to(roomId).emit("game_interrupted");
              }
            }
          }
        }
      });

      socket.on("game_data_updated", (type, data) => {
        if (socket.data.user.roomId) {
          socket.to(socket.data.user.roomId).emit(type, data);
        }
      });

      socket.on("disconnect", () => {
        console.log("participant disconnect! and participant id is  ", socket.id);
        if (!isEmpty(socket.data.user.roomId)) {
          const room = this.roomStore.findRoom(socket.data.user.roomId);
          if (!isNil(room)) {
            console.log("room state is " + " " + room.state);
            room.stopCountDown();
            room.removeParticipant(socket.id);
            if (room.isRoomEmpty()) {
              this.roomStore.removeRoom(socket.data.user.roomId);
            } else {
              if (room.state === ROOM_STATE.GAME_START) {
                room.stopCountDown();
                room.setState(ROOM_STATE.GAME_INTERRUPT);
                this.io.to(socket.data.user.roomId).emit("game_interrupted");
              }
            }
          }
        }
        clearInterval(timer);
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
