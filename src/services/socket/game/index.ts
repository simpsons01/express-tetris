import { logger } from "../../../util";
import { Namespace, Server as SocketServer } from "socket.io";
import { createRoomData, createParticipant, IRoomData } from "./room";
import { v4 as uuidv4 } from "uuid";
import { Server as HttpServer } from "http";
import { AnyObject } from "../../../util";

const createRandomName = (): string => uuidv4();
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

  addRoom(id: string, data: IRoomData, io: Namespace): void {
    this.roomStore.push({ id, data, io });
  }

  getNotEmptyRoomId(): string | null {
    const room = this.roomStore.find((room) => !room.data.isParticipantFull());
    return room === undefined ? null : room.id;
  }

  async createRoom(): Promise<string> {
    const roomId = uuidv4();
    const io = await this.io.of(`/${roomId}`);
    const roomData = createRoomData(ROOM_DEFAULT_PARTICIPANT_NUM, ROOM_DEFAULT_LEFT_SEC);
    io.on("connection", (socket) => {
      if (roomData.isParticipantFull()) return;
      const participant = createParticipant(createRandomName());
      roomData.addParticipant(participant);
      socket.emit("game-participant-joined", participant.basic);
      if (roomData.isParticipantFull()) {
        io.emit("game-start");
        roomData.startCountDown(
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
        roomData.updateParticipantScore(participantId, score);
        socket.broadcast.emit("opponent-nextScoreUpdated", score);
      });
    });
    this.addRoom(roomId, roomData, io);
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
