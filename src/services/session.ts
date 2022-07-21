import session from "express-session";
import env from "../env";
import { isDev } from "../util/index";

const sessionMiddleware = session({
  secret: env.SESSION_SECRET as string,
  cookie: {
    secure: !isDev(),
  },
});

export default sessionMiddleware;
