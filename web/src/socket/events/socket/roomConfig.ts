import type { Server as SocketServer, Socket } from "socket.io";
import type { AnyFunction } from "../../../utils/types";
import {
  verifyCallback,
  createSocketCallbackPayload,
  EVENT_OPERATION_STATUS,
} from "../../../utils/socket";

export default (io: SocketServer, socket: Socket) => {
  const roomConfig = socket.data.roomConfig;

  return (callback?: AnyFunction) => {
    verifyCallback(callback)(
      createSocketCallbackPayload({
        data: {
          initialLevel: roomConfig.initialLevel,
        },
        metadata: {
          status: EVENT_OPERATION_STATUS.SUCCESS,
        },
      })
    );
  };
};
