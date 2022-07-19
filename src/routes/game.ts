import { Router } from "express";
import { isNil } from "ramda";
import gameSocket from "../services/socket/game";

const router = Router();

router.get("/join", async function (req, res) {
  const gameSocketInstance = gameSocket.getInstance();
  if (gameSocketInstance) {
    const notEmptyRoomId = gameSocketInstance.getNotEmptyRoomId();
    if (!isNil(notEmptyRoomId)) {
      res.send(notEmptyRoomId);
    } else {
      const roomId = await gameSocketInstance.createRoom();
      res.send(roomId);
    }
  }
});

export default router;
