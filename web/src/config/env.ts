import dotenv from "dotenv";
import path from "path";
import { isDev } from "../utils/common";

if (isDev()) {
  dotenv.config({ path: path.join(`${__dirname}/../../.env.development`) });
} else {
  dotenv.config({ path: path.join(`${__dirname}/../../.env.production`) });
}

export default process.env;
