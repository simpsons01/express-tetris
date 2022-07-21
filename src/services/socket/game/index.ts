import { logger } from "../../../util";
import { Namespace, Server as SocketServer } from "socket.io";
import { createRoom, createRoomStore, IRoomStore, createParticipant } from "./room";
import { v4 as uuidv4 } from "uuid";
import { Server as HttpServer } from "http";
import { AnyObject } from "../../../util";
import sessionMiddleware from "../../../util/session";
import { Request, Response, NextFunction } from "express";
import { isNil } from "ramda";

const ROOM_DEFAULT_PARTICIPANT_NUM = 2;
const ROOM_DEFAULT_LEFT_SEC = 60;

// TODO: 創建socket的options不行是AnyObject
export type SocketServerOptions = AnyObject;

class GameSocketService {
  io: SocketServer;
  roomStore: IRoomStore;

  constructor(httpServer: HttpServer, options: SocketServerOptions) {
    this.io = new SocketServer(httpServer, options);
    this.roomStore = createRoomStore();
  }

  createRoom(): string {
    const roomId = uuidv4();
    let io: Namespace | null = this.io.of(`/${roomId}`);
    const room = createRoom({
      id: roomId,
      participantLimitNum: ROOM_DEFAULT_PARTICIPANT_NUM,
      leftSec: ROOM_DEFAULT_LEFT_SEC,
    });
    this.roomStore.addRoom(room);
    io.use((socket, next) =>
      sessionMiddleware(socket.request as Request, {} as Response, next as NextFunction)
    );
    io.on("connection", (socket) => {
      const user = socket.request.session.user;
      logger.log(user);
      if (isNil(user)) {
        socket.disconnect();
        return;
      }
      if (!user.socketId) {
        user.socketId = socket.id;
        user.roomId = room.id;
        socket.request.session.save(() => {
          socket.data.roomId = room.id;
          const participant = createParticipant(user.name, socket.id);
          room.addParticipant(participant);
          if (room.isParticipantFull()) {
            (io as Namespace).emit("game-start");
            room.startCountDown(
              (sec) => {
                (io as Namespace).emit("game-countdown", sec);
              },
              () => {
                (io as Namespace).emit("game-over");
              }
            );
          }
        });
      } else {
        logger.log("user is connected");
      }
      socket.on("disconnect", () => {
        logger.log("user is disconnect");
        const handleDisconnect = () => {
          room.removeParticipant(socket.id);
          if (room.isParticipantEmpty()) {
            (io as Namespace).disconnectSockets();
            this.roomStore.removeRoom(socket.data.roomId);
            io = null;
          }
        };
        const user = socket.request.session.user;
        if (!isNil(user)) {
          user.socketId = "";
          user.roomId = "";
          socket.request.session.save(() => {
            handleDisconnect();
          });
        } else {
          handleDisconnect();
        }
      });

      socket.on("game-nextPolyominoUpdated", (nextPolyominoType) => {
        socket.broadcast.emit("opponent-nextPolyominoUpdated", nextPolyominoType);
      });

      socket.on("game-PolyominoUpdated", (polyomino) => {
        socket.broadcast.emit("opponent-nextPolyominoUpdated", polyomino);
      });

      socket.on("game-tetrisUpdated", (tetris) => {
        socket.broadcast.emit("opponent-nextPolyominoUpdated", tetris);
      });

      socket.on("game-scoreUpdated", (participantId: string, score: number) => {
        room.updateParticipantScore(participantId, score);
        socket.broadcast.emit("opponent-nextScoreUpdated", score);
      });
    });

    return roomId;
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
