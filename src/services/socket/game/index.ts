import { logger } from "../../../util";
import { Server as SocketServer, Socket } from "socket.io";
import { createRoomStore, IRoomStore, createParticipant } from "./room";
import { Server as HttpServer } from "http";
import { AnyObject, AnyFunction, SessionUser } from "../../../util/types";
import { isNil } from "ramda";

// TODO: 創建socket的options不行是AnyObject
export type SocketServerOptions = AnyObject;

class GameSocketService {
  io: SocketServer;
  roomStore: IRoomStore;

  constructor(httpServer: HttpServer, options: SocketServerOptions) {
    this.io = new SocketServer(httpServer, options);
    this.roomStore = createRoomStore();
  }

  listen(): void {
    const withUserCheck = (
      socket: Socket,
      callback: AnyFunction<unknown>,
      ...args: Array<unknown>
    ) => {
      const user = socket.request.session.user;
      if (isNil(user)) {
        socket.disconnect();
        return;
      }
      return callback(args);
    };

    this.io.use((socket, next) => {
      if (isNil(socket.request.session.user)) {
        next(new Error("not auth"));
      } else if (socket.request.session.user.socketId) {
        next(new Error("already connected"));
      } else {
        next();
      }
    });
    this.io.on("connection", (socket) => {
      (socket.request.session.user as SessionUser).socketId = socket.id;
      socket.request.session.save(() => {
        socket.emit("socketId-save");
      });

      socket.on("join-game", () => {
        withUserCheck(socket, () => {
          const notEmptyRoom = this.roomStore.getNotEmptyRoom();
          if (!isNil(notEmptyRoom)) {
            const user = socket.request.session.user as SessionUser;
            user.roomId = notEmptyRoom.id;
            socket.request.session.save(() => {
              socket.data.roomId = notEmptyRoom.id;
              const participant = createParticipant(user.name, socket.id);
              notEmptyRoom.addParticipant(participant);
              if (notEmptyRoom.isParticipantFull()) {
                this.io.in(socket.data.roomId).emit("game-start");
                notEmptyRoom.startCountDown(
                  (sec) => {
                    this.io.in(socket.data.roomId).emit("game-countdown", sec);
                  },
                  () => {
                    this.io.in(socket.data.roomId).emit("game-over");
                  }
                );
              }
            });
          }
        });
      });

      socket.on("leave-game", () => {
        const leaveRoom = () => {
          if (!isNil(socket.data.roomId)) {
            const roomId = socket.data.roomId;
            delete socket.data.roomId;
            const room = this.roomStore.findRoom(roomId);
            if (!isNil(room)) {
              room.removeParticipant(socket.id);
            }
          }
        };
        if (!isNil(socket.request.session.user)) {
          socket.request.session.user.roomId = "";
          socket.request.session.save(leaveRoom);
        } else {
          leaveRoom();
        }
      });

      socket.on("disconnect", () => {
        logger.log("user is disconnect");
        const handleDisconnect = () => {
          if (!isNil(socket.data.roomId)) {
            const roomId = socket.data.roomId;
            delete socket.data.roomId;
            const room = this.roomStore.findRoom(roomId);
            if (!isNil(room)) {
              room.removeParticipant(socket.id);
              if (room.isParticipantEmpty()) {
                this.io.in(room.id).disconnectSockets();
                this.roomStore.removeRoom(roomId);
              }
            }
          }
        };
        if (!isNil(socket.request.session.user)) {
          socket.request.session.user.socketId = "";
          socket.request.session.user.roomId = "";
          socket.request.session.save(handleDisconnect);
        } else {
          handleDisconnect();
        }
      });

      // socket.on("game-nextPolyominoUpdated", (nextPolyominoType) => {
      //   socket.to(room.id).emit("opponent-nextPolyominoUpdated", nextPolyominoType);
      // });

      // socket.on("game-PolyominoUpdated", (polyomino) => {
      //   socket.to(room.id).emit("opponent-nextPolyominoUpdated", polyomino);
      // });

      // socket.on("game-tetrisUpdated", (tetris) => {
      //   socket.to(room.id).emit("opponent-nextPolyominoUpdated", tetris);
      // });

      // socket.on("game-scoreUpdated", (participantId: string, score: number) => {
      //   room.updateParticipantScore(participantId, score);
      //   socket.to(room.id).emit("opponent-nextScoreUpdated", score);
      // });
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
