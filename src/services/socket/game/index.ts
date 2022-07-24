import { delay, logger } from "../../../util";
import { RemoteSocket, Server as SocketServer, Socket } from "socket.io";
import { createRoomStore, IRoomStore, createParticipant } from "./_room";
import { Server as HttpServer } from "http";
import { AnyObject, AnyFunction, SessionUser } from "../../../util/types";
import { isEmpty, isNil } from "ramda";

// TODO: 創建socket的options不行是AnyObject
export type SocketServerOptions = AnyObject;

const withUserCheck = (socket: Socket, callback: AnyFunction<unknown>, ...args: Array<unknown>) => {
  const user = socket.request.session.user;
  if (isNil(user)) {
    socket.disconnect();
    return;
  }
  return callback(args);
};

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
    this.io.use((socket, next) => {
      if (isNil(socket.request.session.user)) {
        next(new Error("not auth"));
      } else {
        next();
      }
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
        name: (socket.request.session.user as SessionUser).name,
        roomId: "",
      };

      socket.on("try_join_game", async (done) => {
        try {
          let notInGameSocket: RemoteSocket<AnyObject, AnyObject> | undefined;
          const allConnectSocket = await this.io.fetchSockets();
          for (const socket of allConnectSocket) {
            if (isEmpty(socket.data.user.roomId)) {
              notInGameSocket = socket;
            }
            break;
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
        const room = this.roomStore.findRoom(socket.data.user.roomId);
        if (!isNil(room)) {
          room.updateParticipantReady(socket.id);
          done(true);
          if (room.isParticipantReady()) {
            await delay(2);
            room.startBeforeGameStartCountDown(
              (leftSec: number) => {
                this.io.to(socket.data.user.roomId).emit("before_start_game", leftSec);
              },
              () => {
                room.startCountDown(
                  (leftSec: number) => {
                    this.io.to(socket.data.user.roomId).emit("game_leftSec", leftSec);
                  },
                  () => {
                    const result = room.getResult();
                    this.io.to(socket.data.user.roomId).emit("game_over", result);
                  }
                );
              }
            );
            room.startCountDown();
          }
        } else {
          socket.data.user.roomId = "";
          done(false);
        }
      });

      socket.on("leave_game", () => {
        if (!isEmpty(socket.data.user.roomId)) {
          const roomId = socket.data.user.roomId;
          socket.data.user.roomId = "";
          socket.leave(roomId);
          const room = this.roomStore.findRoom(roomId);
          if (!isNil(room)) {
            room.stopCountDown();
            room.removeParticipant(socket.id);
            if (room.isParticipantEmpty()) {
              this.roomStore.removeRoom(room.id);
            } else {
              if (room.leftSec !== 0) {
                this.io.to(roomId).emit("game_interrupted");
              }
            }
          }
        }
      });

      socket.on("disconnect", () => {
        if (!isEmpty(socket.data.user.roomId)) {
          const room = this.roomStore.findRoom(socket.data.user.roomId);
          if (!isNil(room)) {
            room.stopCountDown();
            if (room.leftSec !== 0) {
              this.io.to(socket.data.user.roomId).emit("game_interrupted");
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
