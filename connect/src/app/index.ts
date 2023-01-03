import cors from "cors";
import express from "express";
import env from "../config/env";
import { isDev } from "../utils/index";

const app = express();
if (!isDev()) app.set("trust proxy", true);
app.use(cors({ origin: env.ALLOW_ORIGIN }));
app.get("/connect/health-check", (req, res) => res.status(200).end());

export default app;
