import { catchAsyncError } from "../../utils/error";
import { Router } from "express";
import * as roomController from "../../controllers/room";
import validateMiddleware from "../../middlewares/validate";
import {
  addNewPlayerToRoomSchema,
  removePlayerFromRoomSchema,
} from "../../validations/room";

const router = Router();

router.post(
  "/add-player",
  validateMiddleware(addNewPlayerToRoomSchema),
  catchAsyncError(roomController.addNewPlayerToRoom)
);

router.delete(
  "/remove-player",
  validateMiddleware(removePlayerFromRoomSchema),
  catchAsyncError(roomController.removePlayerFromRoom)
);

export default router;
