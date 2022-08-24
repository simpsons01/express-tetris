import { isNil } from "ramda";
import { createCountdown } from "../../../util";
import { AnyFunction } from "../../../util/types";

export const DEFAULT_BEFORE_GAME_START_LEFT_SEC = 3;

export const DEFAULT_GAME_END_LEFT_SEC = 60;

export class RoomTimer {
  beforeGameStartCountDownCleanHandler: null | AnyFunction = null;
  endCountDownCleanHandler: null | AnyFunction = null;

  startBeforeGameStartCountDown(
    leftSec: number,
    onCountDown?: (leftSec: number) => void,
    onComplete?: (...args: Array<unknown>) => void
  ): void {
    this.beforeGameStartCountDownCleanHandler = createCountdown(leftSec, onCountDown, onComplete);
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
    this.endCountDownCleanHandler = createCountdown(leftSec, onCountDown, onComplete);
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

export class RoomTimerManager {
  store = new Map<string, RoomTimer>();

  createTimer(id: string): RoomTimer {
    const roomTimer = new RoomTimer();
    this.store.set(id, roomTimer);
    return roomTimer;
  }

  getTimer(id: string): RoomTimer | undefined {
    return this.store.get(id);
  }

  deleteTimer(id: string): void {
    this.store.delete(id);
  }

  hasTimer(id: string): boolean {
    return !isNil(this.store.get(id));
  }
}
