export * from "./player"
export * from "./room"

export interface AnyObject<T = any> {
  [key: string]: T;
}

export type AnyFunction<T = any, K = any> = (...args: Array<T>) => K;

export type AsyncAnyFunction<T = any, K = any> = (
  ...args: Array<T>
) => Promise<K>;

export type IntervalTimer = ReturnType<typeof setInterval>;
