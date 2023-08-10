import type { Server as SocketServer, Socket } from "socket.io";
import roomTimerStore from "../../stores/roomTimer";
import scoreUpdateManagerStore from "../../stores/scoreUpdateOperationManager";
import DisconnectEvent from "../socket/disconnect";
import GameDataUpdatedEvent from "../socket/gameDataUpdated";
import PingEvent from "../socket/ping";
import ResetRoomEvent from "../socket/resetRoom";
import RoomConfigEvent from "../socket/roomConfig";
import ReadyEvent from "../socket/ready";
import { isNil } from "ramda";
import { IoEvents } from "../event";

class ConnectEvents extends IoEvents {
  constructor(io: SocketServer) {
    super(io);
    this.listener = this.listener.bind(this);
    this.logError = this.logError.bind(this);
    this.logInfo = this.logInfo.bind(this);
    this.onError = this.onError.bind(this);
  }

  listener(socket: Socket) {
    const roomId = socket.data.roomId;
    const playerName = socket.data.player.name;

    this.logInfo(`player "${playerName}" connect and join room ${roomId}`);

    socket.join(roomId);

    const scoreUpdateManager = scoreUpdateManagerStore.get(roomId);
    if (isNil(scoreUpdateManager)) {
      scoreUpdateManagerStore.create(roomId);
    }

    const roomTimer = roomTimerStore.get(roomId);
    if (isNil(roomTimer)) {
      roomTimerStore.create(roomId);
    }

    socket.on("ready", new ReadyEvent(this._io, socket).listener);
    socket.on(
      "game_data_updated",
      new GameDataUpdatedEvent(this._io, socket).listener
    );
    socket.on("reset_room", new ResetRoomEvent(this._io, socket).listener);
    socket.on("room_config", new RoomConfigEvent(this._io, socket).listener);
    socket.on("ping", new PingEvent(this._io, socket).listener);
    socket.on("disconnect", new DisconnectEvent(this._io, socket).listener);
  }
}

export default ConnectEvents;
