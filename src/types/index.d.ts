import { SessionUser } from "../util";
import { Session, SessionData } from "express-session";

declare module "express-session" {
  interface SessionData {
    user: SessionUser | null;
  }
}

declare module "http" {
  interface IncomingMessage {
    session: Session & SessionData;
  }
}