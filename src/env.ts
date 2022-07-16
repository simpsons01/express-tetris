import dotenv from "dotenv";
import path from "path";

const envPath =
  process.env.NODE_ENV === "development"
    ? path.join(`${__dirname}/../.env.development`)
    : path.join(`${__dirname}/../.env.production`);

dotenv.config({ path: envPath });
