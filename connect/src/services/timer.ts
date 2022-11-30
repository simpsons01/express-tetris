import { isNil } from "ramda";
import { createCountdown } from "../util";
import { AnyFunction } from "../util/types";

export const DEFAULT_BEFORE_GAME_START_LEFT_SEC = 3;

export const DEFAULT_GAME_END_LEFT_SEC = 60;

class RoomTimer {
  beforeGameStartCountDownCleanHandler: null | AnyFunction = null;
  endCountDownCleanHandler: null | AnyFunction = null;

  startBeforeGameStartCountDown(
    leftSec: number,
    onCountDown?: (leftSec: number) => void,
    onComplete?: (...args: Array<unknown>) => void
  ): void {
    this.beforeGameStartCountDownCleanHandler = createCountdown(
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
    this.endCountDownCleanHandler = createCountdown(
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

const store = new Map<string, RoomTimer>();

export const createTimer = (id: string): RoomTimer => {
  const roomTimer = new RoomTimer();
  store.set(id, roomTimer);
  return roomTimer;
};

export const getTimer = (id: string): RoomTimer | undefined => store.get(id);

export const deleteTimer = (id: string): void => {
  store.delete(id);
};

export const hasTimer = (id: string): boolean => {
  return !isNil(store.get(id));
};
