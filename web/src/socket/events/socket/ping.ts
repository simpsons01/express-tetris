import type { Server as SocketServer, Socket } from "socket.io";
import { AnyFunction } from "../../../common/types";
import { verifyCallback } from "../../../common/socket";

export default (io: SocketServer, socket: Socket) => {
  return (callback: AnyFunction | undefined) => {
    verifyCallback(callback)();
  };
};
