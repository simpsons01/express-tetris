import { catchAsyncError } from "./../utils/error";
import { Router } from "express";
import * as roomController from "../controllers/room";
import authMiddleware from "../middlewares/auth";
import validateMiddleware from "../middlewares/validate";
import {
  addNewPlayerToRoomSchema,
  createRoomSchema,
  removePlayerFromRoomSchema,
} from "../validations/room";

const router = Router();

router.post(
  "/create",
  authMiddleware,
  validateMiddleware(createRoomSchema),
  catchAsyncError(roomController.createRoom)
);

router.post(
  "/add-player",
  authMiddleware,
  validateMiddleware(addNewPlayerToRoomSchema),
  catchAsyncError(roomController.addNewPlayerToRoom)
);

router.delete(
  "/remove-player",
  authMiddleware,
  validateMiddleware(removePlayerFromRoomSchema),
  catchAsyncError(roomController.removePlayerFromRoom)
);

export default router;
