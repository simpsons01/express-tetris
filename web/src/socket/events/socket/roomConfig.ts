import type { Server as SocketServer, Socket } from "socket.io";
import type { AnyFunction } from "../../../common/types";
import {
  verifyCallback,
  createSocketCallbackPayload,
  EVENT_OPERATION_STATUS,
} from "../../../common/socket";
import { SocketEvents } from "../event";

class ResetConfigEvent extends SocketEvents {
  constructor(io: SocketServer, socket: Socket) {
    super(io, socket);
    this.listener = this.listener.bind(this);
    this.logError = this.logError.bind(this);
    this.logInfo = this.logInfo.bind(this);
    this.onError = this.onError.bind(this);
  }
  async listener(callback: AnyFunction | undefined) {
    verifyCallback(callback)(
      createSocketCallbackPayload({
        data: {
          initialLevel: this.roomConfig.initialLevel,
        },
        metadata: {
          status: EVENT_OPERATION_STATUS.SUCCESS,
        },
      })
    );
  }
}

export default ResetConfigEvent;
