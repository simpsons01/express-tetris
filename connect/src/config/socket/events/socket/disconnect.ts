import { Server as SocketServer, Socket } from "socket.io";
import { isNil } from "ramda";
import * as roomService from "../../../../services/room";
import * as roomUtils from "../../../../utils/room";
import * as playerStoreUtils from "../../../../utils/playerStore";
import * as roomTimerUtils from "../../../../utils/roomTimer";

export const disconnectEvt = (io: SocketServer, socket: Socket) => {
  const roomId = socket.data.roomId;
  const playerId = socket.data.player.id;

  return async () => {
    try {
      const room = await roomService.getRoom(roomId);
      if (!isNil(room)) {
        const newRoom = roomUtils.createNewRoomRemovedPlayer(room, playerId);
        const isNewRoomEmpty = roomUtils.checkRoomIsEmpty(newRoom);
        const isHost = room.host.id === playerId;
        if (isNewRoomEmpty || isHost) {
          const roomTimer = roomTimerUtils.getRoomTimer(roomId);
          if (!isNil(roomTimer)) {
            roomTimer.clear();
            roomTimerUtils.deleteRoomTimer(roomId);
          }
          const playerStore = playerStoreUtils.getPlayerStore(roomId);
          if (!isNil(playerStore)) {
            playerStoreUtils.deletePlayerStore(roomId);
          }
          await roomService.deleteRoom(roomId);
          if (isHost) io.in(roomId).emit("room_host_leave");
        } else {
          if (room.state === roomService.ROOM_STATE.GAME_START) {
            await roomService.updateRoom(
              roomUtils.createNewRoomState(
                newRoom,
                roomService.ROOM_STATE.GAME_INTERRUPT
              )
            );
            const roomTimer = roomTimerUtils.getRoomTimer(roomId);
            if (!isNil(roomTimer)) {
              roomTimer.clear();
            }
            const playerStore = playerStoreUtils.getPlayerStore(roomId);
            if (!isNil(playerStore)) {
              playerStore.resetScore();
            }
            io.in(roomId).emit("room_participant_leave");
          } else {
            await roomService.updateRoom(newRoom);
          }
        }
      } else {
        io.in(roomId).emit("error_occur");
      }
    } catch (error) {
      //
    }
  };
};
