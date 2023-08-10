import type { Server as SocketServer, Socket } from "socket.io";
import type { AnyFunction } from "../../../common/types";
import type { IRoom } from "../../../common/types";
import roomService from "../../../services/room";
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
import { SocketEvents } from "../event";

class ResetRoomEvent extends SocketEvents {
  constructor(io: SocketServer, socket: Socket) {
    super(io, socket);
    this.listener = this.listener.bind(this);
    this.logError = this.logError.bind(this);
    this.logInfo = this.logInfo.bind(this);
    this.onError = this.onError.bind(this);
  }

  async listener(callback: AnyFunction | undefined) {
    try {
      const room = await roomService.getRoom(this.roomId);
      if (isNil(room)) {
        throw new Error("room was not found");
      }
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
    } catch (err) {
      this.onError(err as Error, false);
      verifyCallback(callback)(
        createSocketCallbackPayload({
          metadata: { status: EVENT_OPERATION_STATUS.FAILED },
        })
      );
    }
  }
}

export default ResetRoomEvent;
