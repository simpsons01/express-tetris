import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { isEmpty } from "ramda";
import RoomStore, { createParticipant, createTetrisRoom } from "../services/room";

const router = Router();

router.get("/join", function (req, res) {
  const roomStore = RoomStore.getStore();
  // TODO: 要寫一個創建隨機名字的方法
  const randomName = uuidv4();
  const participant = createParticipant(randomName);
  const notFullRoomId = roomStore.findRoomIdNotFull();
  if (isEmpty(notFullRoomId)) {
    const room = createTetrisRoom();
    room.addParticipant(participant);
    roomStore.addRoom(room);
    res.json({
      participant,
      roomId: room.id,
    });
  } else {
    const roomId = notFullRoomId[0];
    roomStore.addParticipantToRoom(roomId, participant);
    res.json({
      participant,
      roomId,
    });
  }
});

export default router;
