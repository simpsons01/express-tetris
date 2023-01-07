import { Server as SocketServer, Socket } from "socket.io";
import {
  verifyCallback,
  createSocketCallbackPayload,
  EVENT_OPERATION_STATUS,
} from "../../../../utils/socket";
import { AnyFunction } from "../../../../utils/types";

export const roomConfigEvt = (io: SocketServer, socket: Socket) => {
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
