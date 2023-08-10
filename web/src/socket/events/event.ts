import type { IPlayer, IRoom } from "../../common/types";
import type { Server as SocketServer, Socket } from "socket.io";
import logger from "../../config/logger";

export abstract class IoEvents {
  protected _io: SocketServer;

  constructor(io: SocketServer) {
    this._io = io;
  }

  logInfo(message: string) {
    logger.info(`[socket.io], ${message}`);
  }

  logError(error: Error) {
    error.message = `[socket.io], ${error.message}`;
    logger.error(error);
  }

  onError(error: Error) {
    this._io.emit("error_occur", error);
    this.logError(error);
  }

  abstract listener(...args: Array<any>): void;
}

export abstract class SocketEvents extends IoEvents {
  protected _socket: Socket;

  constructor(io: SocketServer, socket: Socket) {
    super(io);
    this._socket = socket;
  }

  get roomId(): string {
    return this._socket.data.roomId;
  }

  get roomConfig(): IRoom["config"] {
    return this._socket.data.roomConfig;
  }

  get player(): IPlayer {
    return this._socket.data.player;
  }

  logInfo(message: string) {
    logger.info(`[socket.io] roomId:${this.roomId}, ${message}`);
  }

  logError(error: Error) {
    error.message = `[socket.io] roomId:${this.roomId}, ${error.message}`;
    logger.error(error);
  }

  onError(error: Error, shouldBroadcast = false) {
    if (shouldBroadcast) {
      this._io.in(this.roomId).emit("error_occur", error);
    } else {
      this._socket.emit("error_occur", error);
    }
    this.logError(error);
  }
}
