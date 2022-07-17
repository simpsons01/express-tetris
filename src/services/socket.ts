import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import { AnyObject } from "../util";
import RoomStore from "./room";

// TODO: 創建socket的options不行是AnyObject
type SocketServerOptions = AnyObject;

class SocketService {
  protected io: SocketServer;

  constructor(httpServer: HttpServer, opts: SocketServerOptions) {
    this.io = new SocketServer(httpServer, opts);
  }
}

export class TetrisGameSocketService extends SocketService {
  listen(): void {
    this.io.on("connection", (socket) => {
      socket.on("join-game", (roomId) => {
        if (RoomStore.getStore().findRoom(roomId) !== undefined) {
          socket.join(roomId);
        }
      });
      socket.on("update-game", (roomId) => {
        if (RoomStore.getStore().findRoom(roomId) !== undefined) {
          socket.to(roomId).emit("update-game");
        }
      });
    });
  }
}
