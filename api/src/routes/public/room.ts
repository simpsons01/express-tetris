import { catchAsyncError } from "../../utils/error";
import { Router } from "express";
import * as roomController from "../../controllers/room";
import authMiddleware from "../../middlewares/auth";
import validateMiddleware from "../../middlewares/validate";
import { createRoomSchema } from "../../validations/room";

const router = Router();

router.get("/list", authMiddleware, catchAsyncError(roomController.getRooms));

router.get("/:id", authMiddleware, catchAsyncError(roomController.getRoom));

router.post(
  "/create",
  authMiddleware,
  validateMiddleware(createRoomSchema),
  catchAsyncError(roomController.createRoom)
);

router.post(
  "/join/:id",
  authMiddleware,
  catchAsyncError(roomController.joinRoom)
);

router.delete(
  "/leave/:id",
  authMiddleware,
  catchAsyncError(roomController.leaveRoom)
);

export default router;
