import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import { AnyObject, logger } from "../util";

type SocketServerOptions = AnyObject;

class SocketService {
  private io: SocketServer;

  constructor(httpServer: HttpServer, opts: SocketServerOptions) {
    this.io = new SocketServer(httpServer, opts);
  }
}

let socketServiceInstance: SocketService | undefined;

export default {
  use(httpServer: HttpServer, opts: SocketServerOptions): void {
    if (socketServiceInstance === undefined) {
      socketServiceInstance = new SocketService(httpServer, opts);
    } else {
      logger.warn("socket instance is be initialized");
    }
  },
  get: (): SocketService | undefined => {
    if (socketServiceInstance === undefined) {
      logger.warn("socket instance is not be initialized");
    }
    return socketServiceInstance;
  },
};
