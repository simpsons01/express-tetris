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

  logError(error: unknown) {
    if (error instanceof Error) {
      error.message = `[socket.io], ${error.message}`;
    }
    logger.error(error);
  }

  onError(error: unknown) {
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

  get socketData(): {
    roomId: string;
    roomConfig: IRoom["config"];
    player: IPlayer;
  } {
    return {
      roomId: this._socket.data.roomId,
      roomConfig: this._socket.data.roomConfig,
      player: this._socket.data.player,
    };
  }

  logInfo(message: string) {
    logger.info(`[socket.io] roomId:${this.socketData.roomId}, ${message}`);
  }

  logError(error: unknown) {
    if (error instanceof Error) {
      error.message = `[socket.io] roomId:${this.socketData.roomId}, ${error.message}`;
    }
    logger.error(error);
  }

  onError(error: unknown, shouldBroadcast = false) {
    if (shouldBroadcast) {
      this._io.in(this.socketData.roomId).emit("error_occur", error);
    } else {
      this._socket.emit("error_occur", error);
    }
    this.logError(error);
  }
}
