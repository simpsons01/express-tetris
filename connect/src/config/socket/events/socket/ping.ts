import { AnyFunction } from "../../../../utils/types";
import { Server as SocketServer, Socket } from "socket.io";
import { verifyCallback } from "../../../../utils/socket";

export const pingEvt = (io: SocketServer, socket: Socket) => {
  return (callback: AnyFunction | undefined) => {
    verifyCallback(callback)();
  };
};
