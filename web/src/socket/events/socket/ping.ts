import type { Server as SocketServer, Socket } from "socket.io";
import { AnyFunction } from "../../../common/types";
import { verifyCallback } from "../../../common/socket";
import { SocketEvents } from "../event";

class PingEvent extends SocketEvents {
  constructor(io: SocketServer, socket: Socket) {
    super(io, socket);
    this.listener = this.listener.bind(this);
    this.logError = this.logError.bind(this);
    this.logInfo = this.logInfo.bind(this);
    this.onError = this.onError.bind(this);
  }

  listener(callback: AnyFunction | undefined) {
    verifyCallback(callback)();
  }
}

export default PingEvent;
