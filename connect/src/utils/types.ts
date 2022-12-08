export interface AnyObject<T = any> {
  [key: string]: T;
}

export type AnyFunction<T = any, K = any | undefined | void | unknown> = (
  ...args: Array<T>
) => K;

export type IntervalTimer = ReturnType<typeof setInterval>;
