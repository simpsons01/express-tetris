import { Router } from "express";

const router = Router();

router.get("/", function (req, res) {
  res.send("hello world");
});

export default router;
