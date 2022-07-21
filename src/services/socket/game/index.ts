import { logger } from "../../../util";
import { Namespace, Server as SocketServer } from "socket.io";
import { createRoom, createRoomStore, IRoomStore } from "./room";
import { v4 as uuidv4 } from "uuid";
import { Server as HttpServer } from "http";
import { AnyObject } from "../../../util";

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
    io.on("connection", (socket) => {
      socket.on("participant-join", (participant, callback) => {
        room.addParticipant(participant);
        callback();
      });

      socket.on("participant-leave", (participantId, callback) => {
        room.removeParticipant(participantId);
        callback();
      });

      socket.on("check-participant-isfull", () => {
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

      socket.on("check-participant-isEmpty", () => {
        if (room.isParticipantEmpty()) {
          (io as Namespace).disconnectSockets();
          (io as Namespace).removeAllListeners();
          this.roomStore.removeRoom(room.id);
          io = null;
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
  initialize(httpServer: HttpServer, options: SocketServerOptions): void {
    if (gameSocketInstance === undefined) {
      gameSocketInstance = new GameSocketService(httpServer, options);
    } else {
      logger.warn("tetris game socket service is initialized");
    }
  },
  getInstance(): GameSocketService | undefined {
    if (gameSocketInstance === undefined) {
      logger.warn("tetris game socket service is not initialized");
    }
    return gameSocketInstance;
  },
};
