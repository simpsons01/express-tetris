import { AnyObject } from "./../util/types";
import { Router, Request, Response, NextFunction } from "express";
import { isNil } from "ramda";
import { v4 as uuidv4 } from "uuid";

const createRandomName = () => uuidv4();

const router = Router();

router.post(
  "/online",
  function (
    req: Request<AnyObject, AnyObject, { name?: string }>,
    res: Response,
    next: NextFunction
  ) {
    const { name } = req.body;
    if (!req.session.user) {
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.user = {
          name: !isNil(name) ? name : createRandomName(),
        };
        res.status(200).json(req.session.user);
      });
    } else {
      res.status(200).end();
    }
  }
);

router.post(
  "/offline",
  function (req: Request, res: Response, next: NextFunction) {
    if (req.session.user) {
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.user = null;
        res.status(200).end();
      });
    } else {
      res.status(200).end();
    }
  }
);

export default router;
