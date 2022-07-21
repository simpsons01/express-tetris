import { createParticipant } from "./../services/socket/game/room";
import { AnyObject } from "./../util/index";
import { Router, Request, Response, NextFunction } from "express";
import { isNil } from "ramda";
import gameSocket from "../services/socket/game";
import { v4 as uuidv4 } from "uuid";

const createRandomName = () => uuidv4();

const router = Router();

router.post(
  "/online",
  function (req: Request<AnyObject, AnyObject, { name?: string }>, res: Response, next: NextFunction) {
    const { name } = req.body;
    if (!req.session.user) {
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.user = {
          name: !isNil(name) ? name : createRandomName(),
          inGame: false,
        };
        req.session.save((err) => {
          if (err) return next(err);
          res.status(200).json(req.session.user);
        });
      });
    } else {
      res.status(200).end();
    }
  }
);

router.post("/offline", function (req: Request, res: Response, next: NextFunction) {
  if (req.session.user) {
    req.session.user = null;
    req.session.save((err) => {
      if (err) next(err);
      req.session.regenerate((err) => {
        if (err) next(err);
        res.status(200);
      });
    });
  } else {
    res.status(200).end();
  }
});

router.post("/join-game", function (req: Request, res: Response, next: NextFunction) {
  if (!isNil(req.session.user) && !req.session.user.inGame) {
    req.session.user.inGame = true;
    const { name: userName } = req.session.user;
    const participant = createParticipant(userName);
    const gameSocketInstance = gameSocket.getInstance();
    if (!isNil(gameSocketInstance)) {
      const notEmptyRoomId = gameSocketInstance.roomStore.getNotEmptyRoomId();
      if (!isNil(notEmptyRoomId)) {
        res.status(200).json({ roomId: notEmptyRoomId, participant });
      } else {
        const roomId = gameSocketInstance.createRoom();
        res.status(200).json({ roomId, participant });
      }
    } else {
      res.status(403).end();
    }
  } else {
    res.status(403).end();
  }
});

export default router;
