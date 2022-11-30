import { AnyFunction, is, isNil } from "ramda";
import { IntervalTimer } from "./types";

export const isDev = (): boolean => process.env.NODE_ENV === "development";

export const delay = (delay: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delay * 1000);
  });
};

export const createCountdown = (
  leftSec: number,
  onCountDown?: (leftSec: number) => void,
  onComplete?: (...args: Array<unknown>) => void
): AnyFunction => {
  let intervalTimer: IntervalTimer | null;
  const clean = () => {
    if (!isNil(intervalTimer)) {
      clearInterval(intervalTimer);
      intervalTimer = null;
    }
  };
  intervalTimer = setInterval(() => {
    leftSec -= 1;
    if (is(Function, onCountDown)) onCountDown(leftSec);
    if (leftSec === 0) {
      clean();
      if (is(Function, onComplete)) onComplete();
    }
  }, 1000);
  if (is(Function, onCountDown)) onCountDown(leftSec);
  return clean;
};
