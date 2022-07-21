import { logger } from "../../../util";
import { Namespace, Server as SocketServer } from "socket.io";
import { createRoom, IRoomData, IParticipant } from "./room";
import { v4 as uuidv4 } from "uuid";
import { Server as HttpServer } from "http";
import { AnyObject } from "../../../util";

const ROOM_DEFAULT_PARTICIPANT_NUM = 2;
const ROOM_DEFAULT_LEFT_SEC = 60;

// TODO: 創建socket的options不行是AnyObject
export type SocketServerOptions = AnyObject;

class GameSocketService {
  io: SocketServer;

  roomStore: Array<{ id: string; data: IRoomData; io: Namespace }> = [];

  constructor(httpServer: HttpServer, options: SocketServerOptions) {
    this.io = new SocketServer(httpServer, options);
  }

  getNotEmptyRoomId(): string | null {
    const room = this.roomStore.find((room) => !room.data.isParticipantFull());
    return room === undefined ? null : room.id;
  }

  checkRoomEmpty(roomId: string): boolean {
    let isEmpty = false;
    this.roomStore.forEach((room) => {
      if (room.id === roomId) {
        if (room.data.isParticipantEmpty()) {
          isEmpty = true;
        }
      }
    });
    return isEmpty;
  }

  addParticipantToRoom(participant: IParticipant, roomId: string) {
    this.roomStore.forEach((room) => {
      if (room.id === roomId) {
        if (!room.data.isParticipantFull()) {
          room.data.addParticipant(participant);
        }
      }
    });
  }

  removeParticipantFromRoom(roomId: string, participantId: string, socketId: string) {
    this.roomStore.forEach((room) => {
      if (room.id === roomId) {
        room.data.removeParticipant(participantId);
        room.io.sockets.forEach((socket) => {
          if (socket.id === socketId) {
            socket.disconnect();
          }
        });
      }
    });
  }

  createRoom(): string {
    const roomId = uuidv4();
    const io = this.io.of(`/${roomId}`);
    const room = createRoom(ROOM_DEFAULT_PARTICIPANT_NUM, ROOM_DEFAULT_LEFT_SEC);
    this.roomStore.push({ id: roomId, data: room, io });
    io.on("connection", (socket) => {
      if (room.isParticipantFull()) {
        io.emit("game-start");
        room.startCountDown(
          (sec) => {
            io.emit("game-countdown", sec);
          },
          () => {
            io.emit("game-over");
          }
        );
      }
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

  closeRoom(roomId: string): void {
    const index = this.roomStore.findIndex((room) => room.id === roomId);
    if (index > -1) {
      this.roomStore[index].io.disconnectSockets();
      this.roomStore[index].io.removeAllListeners();
      this.roomStore.splice(index, 1);
    }
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
