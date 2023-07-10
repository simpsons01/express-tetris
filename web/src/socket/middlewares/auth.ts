import type { Server as SocketServer, Socket } from "socket.io";
import type { ExtendedError } from "socket.io/dist/namespace";
import type { JwtPayload } from "jsonwebtoken";
import roomService from "../../services/room";
import playerService from "../../services/player";
import { isNil, isEmpty } from "ramda";
import { verifyToken } from "../../common/token";
import { checkPlayerIsInRoom } from "../../common/room";

export const authMiddleware =
  (io: SocketServer) =>
  async (socket: Socket, next: (err?: ExtendedError | undefined) => void) => {
    const token = socket.handshake.auth.token;
    const query = socket.handshake.query;

    if (isNil(token) || isEmpty(token)) {
      return next(new Error("miss required token"));
    }

    if (
      isNil(query) ||
      isNil(query.roomId) ||
      isNil(query.playerId) ||
      isNil(query.playerName)
    ) {
      return next(new Error("miss required query"));
    }

    const connectSockets = await io.fetchSockets();
    for (const connectSocket of connectSockets) {
      if (query.playerId === connectSocket.data.player.id) {
        next(new Error("already connected"));
        return;
      }
    }

    try {
      const decode = verifyToken(token) as JwtPayload;
      const player = await playerService.getPlayer(decode.name);
      if (isNil(player)) {
        return next(new Error("auth failed"));
      }
      socket.data.player = player;
    } catch (err) {
      return next(new Error("auth failed"));
    }

    try {
      const room = await roomService.getRoom(query.roomId as string);
      if (isNil(room)) {
        return next(new Error("get room failed"));
      }
      if (!checkPlayerIsInRoom(room, query.playerId as string)) {
        return next(new Error("get room failed"));
      }
      socket.data.roomConfig = room.config;
      socket.data.roomId = room.id;
    } catch (err) {
      return next(new Error("get room failed"));
    }

    next();
  };
