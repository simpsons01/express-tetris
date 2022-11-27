import cors from "cors";
import express from "express";
import bodyParser from "body-parser";
import env from "./env";
import { isDev } from "./util/index";

try {
  const app = express();
  if (!isDev()) app.set("trust proxy", true);
  app.use(
    cors({
      origin: env.ALLOW_ORIGIN,
      credentials: true,
    })
  );
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.get("/health-check", (req, res) => res.status(200).end());
  const port = env.PORT || 3131;
  app.listen(env.PORT || 3131, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
} catch (error) {
  console.log(error);
  process.exit(1);
}
