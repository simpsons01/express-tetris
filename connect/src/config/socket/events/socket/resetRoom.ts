import { Server as SocketServer, Socket } from "socket.io";
import { isNil } from "ramda";
import * as roomService from "../../../../services/room";
import * as roomUtils from "../../../../utils/room";
import {
  verifyCallback,
  EVENT_OPERATION_STATUS,
  createSocketCallbackPayload,
} from "../../../../utils/socket";
import { AnyFunction } from "../../../../utils/types";

export const resetRoomEvt = (io: SocketServer, socket: Socket) => {
  const roomId = socket.data.roomId;

  return async (callback: AnyFunction | undefined) => {
    try {
      const room = await roomService.getRoom(roomId);
      if (!isNil(room)) {
        if (room.state !== roomService.ROOM_STATE.CREATED) {
          const _newRoom = roomUtils.createNewRoomState(
            room,
            roomService.ROOM_STATE.CREATED
          );
          const newRoom = roomUtils.createNewRoomPlayersToNotReady(_newRoom);
          await roomService.updateRoom(newRoom);
        }
        verifyCallback(callback)(
          createSocketCallbackPayload({
            metadata: { status: EVENT_OPERATION_STATUS.SUCCESS },
          })
        );
      } else {
        verifyCallback(callback)(
          createSocketCallbackPayload({
            metadata: { status: EVENT_OPERATION_STATUS.FAILED },
          })
        );
        socket.emit("error_occur");
      }
    } catch (err) {
      verifyCallback(callback)(
        createSocketCallbackPayload({
          metadata: { status: EVENT_OPERATION_STATUS.FAILED },
        })
      );
      socket.emit("error_occur");
    }
  };
};
