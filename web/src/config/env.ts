import dotenv from "dotenv";
import path from "path";
import { isDev } from "../common/utils";

if (isDev()) {
  dotenv.config({ path: path.join(`${__dirname}/../../.env.development`) });
} else {
  dotenv.config({ path: path.join(`${__dirname}/../../.env.production`) });
  process.env.ALLOW_ORIGIN = `https://${process.env.ALLOW_ORIGIN}.onrender.com`;
}

export default process.env;
