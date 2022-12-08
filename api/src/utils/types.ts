export interface AnyObject<T = any> {
  [key: string]: T;
}

export type AnyFunction<T = any, K = any> = (...args: Array<T>) => K;
