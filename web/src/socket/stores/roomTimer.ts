import { RoomTimer } from "../../utils/roomTimer";

export class RoomTimerStore extends Map<string, RoomTimer> {
  create(id: string): RoomTimer {
    const roomTimer = new RoomTimer();
    this.set(id, roomTimer);
    return roomTimer;
  }
}

export default new RoomTimerStore();
