export {};

declare module "express-session" {
  interface SessionData {
    user: {
      name: string;
      inGame: boolean;
    } | null;
  }
}
