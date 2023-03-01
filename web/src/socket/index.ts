import type { ServerOptions } from "socket.io";
import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import { authMiddleware } from "./middlewares/auth";
import connectEvt from "./events/io/connect";

export const initialize = (
  httpServer: HttpServer,
  options: Partial<ServerOptions>
) => {
  const io = new SocketServer(httpServer, options);
  io.use(authMiddleware(io));
  io.on("connection", connectEvt(io));
};
