import { Router } from "express";
import { catchAsyncError } from "../utils/error";
import * as playerController from "../controllers/player";
import validateMiddleware from "../middlewares/validate";
import { createPlayerSchema } from "../validations/player";
import authMiddleware from "../middlewares/auth";

const router = Router();

router.get("/get", authMiddleware, catchAsyncError(playerController.getPlayer));

router.post(
  "/create",
  validateMiddleware(createPlayerSchema),
  catchAsyncError(playerController.createNewPlayer)
);

export default router;
