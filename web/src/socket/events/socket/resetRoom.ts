import type { AnyFunction } from "../../../common/types";
import type { Server as SocketServer, Socket } from "socket.io";
import type { IRoom } from "../../../common/types";
import roomService from "../../../services/room";
import logger from "../../../config/logger";
import {
  pipeCreateNewRoomFn,
  createNewRoomState,
  createNewRoomPlayersToNotReady,
} from "../../../common/room";
import {
  verifyCallback,
  EVENT_OPERATION_STATUS,
  createSocketCallbackPayload,
} from "../../../common/socket";
import { ROOM_STATE } from "../../../common/types";
import { isNil } from "ramda";

export default (io: SocketServer, socket: Socket) => {
  const roomId = socket.data.roomId;

  return async (callback: AnyFunction | undefined) => {
    try {
      const room = await roomService.getRoom(roomId);
      if (!isNil(room)) {
        if (room.state !== ROOM_STATE.CREATED) {
          await roomService.updateRoom(
            pipeCreateNewRoomFn(
              room,
              (room: IRoom) => createNewRoomState(room, ROOM_STATE.CREATED),
              createNewRoomPlayersToNotReady
            )
          );
        }
        verifyCallback(callback)(
          createSocketCallbackPayload({
            metadata: { status: EVENT_OPERATION_STATUS.SUCCESS },
          })
        );
      } else {
        throw new Error("room was not found");
      }
    } catch (err) {
      logger.error(err);
      verifyCallback(callback)(
        createSocketCallbackPayload({
          metadata: { status: EVENT_OPERATION_STATUS.FAILED },
        })
      );
      socket.emit("error_occur");
    }
  };
};
