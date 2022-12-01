import { isNil } from "ramda";
import { createCountdown } from ".";
import { AnyFunction } from "./types";

export const DEFAULT_BEFORE_GAME_START_LEFT_SEC = 3;

export const DEFAULT_GAME_END_LEFT_SEC = 60;

export interface IRoomTimer {
  startBeforeGameStartCountDown(
    leftSec: number,
    onCountDown?: (leftSec: number) => void,
    onComplete?: (...args: Array<unknown>) => void
  ): void;
  clearBeforeGameStartCountDown(): void;
  startGameEndCountDown(
    leftSec: number,
    onCountDown?: (leftSec: number) => void,
    onComplete?: (...args: Array<unknown>) => void
  ): void;
  clearGameEndCountDown(): void;
  clear(): void;
}

class RoomTimer implements IRoomTimer {
  private beforeGameStartCountDownCleanHandler: null | AnyFunction = null;
  private endCountDownCleanHandler: null | AnyFunction = null;

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

const store = new Map<string, IRoomTimer>();

export const createRoomTimer = (id: string): IRoomTimer => {
  const roomTimer = new RoomTimer();
  store.set(id, roomTimer);
  return roomTimer;
};

export const getRoomTimer = (id: string): IRoomTimer | undefined =>
  store.get(id);

export const deleteRoomTimer = (id: string): void => {
  store.delete(id);
};

export const hasRoomTimer = (id: string): boolean => {
  return !isNil(store.get(id));
};
