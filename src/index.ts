import "./env";
import express, { Express } from "express";
import indexRouter from "./routes/index";

const app: Express = express();
app.use("/", indexRouter);

const port = process.env.PORT || 3030;
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
