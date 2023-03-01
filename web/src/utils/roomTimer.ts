import { isNil, is } from "ramda";
import { AnyFunction, IntervalTimer } from "./types";

export const DEFAULT_BEFORE_GAME_START_LEFT_SEC = 3;

export const DEFAULT_GAME_END_LEFT_SEC = 60;

const _createCountdown = (
  leftSec: number,
  onCountDown?: (leftSec: number) => void,
  onComplete?: (...args: Array<unknown>) => void
): AnyFunction => {
  let intervalTimer: IntervalTimer | null;
  const doOnCountDown = (sec: number) => {
    if (is(Function, onCountDown)) onCountDown(sec);
  };
  const clean = () => {
    if (!isNil(intervalTimer)) {
      clearInterval(intervalTimer);
      intervalTimer = null;
    }
  };
  intervalTimer = setInterval(() => {
    leftSec -= 1;
    if (is(Function, onCountDown)) doOnCountDown(leftSec);
    if (leftSec === 0) {
      clean();
      if (is(Function, onComplete)) onComplete();
    }
  }, 1000);
  doOnCountDown(leftSec);
  return clean;
};

export class RoomTimer {
  private beforeGameStartCountDownCleanHandler: null | AnyFunction = null;
  private endCountDownCleanHandler: null | AnyFunction = null;

  startBeforeGameStartCountDown(
    leftSec: number,
    onCountDown?: (leftSec: number) => void,
    onComplete?: (...args: Array<unknown>) => void
  ): void {
    this.beforeGameStartCountDownCleanHandler = _createCountdown(
      leftSec,
      onCountDown,
      onComplete
    );
  }

  clearBeforeGameStartCountDown(): void {
    if (!isNil(this.beforeGameStartCountDownCleanHandler)) {
      this.beforeGameStartCountDownCleanHandler();
      this.beforeGameStartCountDownCleanHandler = null;
    }
  }

  startGameEndCountDown(
    leftSec: number,
    onCountDown?: (leftSec: number) => void,
    onComplete?: (...args: Array<unknown>) => void
  ): void {
    this.endCountDownCleanHandler = _createCountdown(
      leftSec,
      onCountDown,
      onComplete
    );
  }

  clearGameEndCountDown(): void {
    if (!isNil(this.endCountDownCleanHandler)) {
      this.endCountDownCleanHandler();
      this.endCountDownCleanHandler = null;
    }
  }

  clear(): void {
    this.clearBeforeGameStartCountDown();
    this.clearGameEndCountDown();
  }
}
