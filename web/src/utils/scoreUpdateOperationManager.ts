import type { AsyncAnyFunction } from "./types";
import { EventEmitter } from "events";

class OperationQueue extends EventEmitter {
  _: Array<Operation> = [];

  add(operation: Operation) {
    this._.push(operation);
  }

  remove() {
    this._.shift();
  }

  peek() {
    return this._[0];
  }

  isEmpty() {
    return this._.length === 0;
  }
}

class Operation {
  private _queue: OperationQueue;

  fn: AsyncAnyFunction;

  constructor(fn: AsyncAnyFunction, queue: OperationQueue) {
    this._queue = queue;
    this.fn = fn;
    if (this._queue.isEmpty()) {
      this.do();
    }
  }

  async do() {
    await this.fn();
    this._queue.remove();
    if (this._queue.isEmpty()) {
      this._queue.emit("empty");
    } else {
      const nextOperation = this._queue.peek();
      nextOperation.do();
    }
  }
}

class ScoreUpdateOperationManager extends EventEmitter {
  private _queue: OperationQueue;

  constructor() {
    super();
    this._queue = new OperationQueue();
    this._queue.on("empty", () => this.emit("clear"));
  }

  get isProcessing() {
    return !this._queue.isEmpty();
  }

  add(fn: AsyncAnyFunction) {
    this._queue.add(new Operation(fn, this._queue));
  }

  clear() {
    while (!this._queue.isEmpty()) {
      this._queue.remove();
    }
  }
}

export default ScoreUpdateOperationManager;
