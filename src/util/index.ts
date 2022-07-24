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

export const delay = (delay: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delay * 1000);
  });
};
