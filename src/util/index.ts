export const logger = {
  log: <T = unknown>(...args: Array<T>): void => {
    console.log(...args);
  },
  warn: <T = unknown>(...args: Array<T>): void => {
    console.warn(...args);
  },
  error: <T = unknown>(...args: Array<T>): void => {
    console.error(...args);
  },
};

export const isDev = (): boolean => process.env.NODE_ENV === "development";

export interface AnyObject<T = any> {
  [key: string]: T;
}

export interface SessionUser {
  name: string;
  socketId: string;
  roomId: string;
}
