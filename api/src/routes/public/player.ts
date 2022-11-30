import { catchAsyncError } from "../../utils/error";
import { Router } from "express";
import * as playerController from "../../controllers/player";
import validateMiddleware from "../../middlewares/validate";
import { createPlayerSchema } from "../../validations/player";

const router = Router();

router.post(
  "/create",
  validateMiddleware(createPlayerSchema),
  catchAsyncError(playerController.createPlayer)
);

export default router;
