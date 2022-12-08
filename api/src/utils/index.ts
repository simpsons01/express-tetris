import { isNil } from "ramda";

export const isDev = (): boolean => process.env.NODE_ENV === "development";

export const delay = (delay: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delay * 1000);
  });
};

export const isPlainObject = (val: any) =>
  !isNil(val) && Object.prototype.toString.call(val) === "[object Object]";

export const toHex = (val: string) => {
  let string = "";
  for (let i = 0; i < val.length; i++) {
    string += val.charCodeAt(i).toString(16);
  }
  return string;
};
