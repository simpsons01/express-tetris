import type { Server as SocketServer, Socket } from "socket.io";
import { AnyFunction } from "../../../utils/types";
import { verifyCallback } from "../../../utils/socket";

export default (io: SocketServer, socket: Socket) => {
  return (callback: AnyFunction | undefined) => {
    verifyCallback(callback)();
  };
};
