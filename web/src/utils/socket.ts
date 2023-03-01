import { isNil, is } from "ramda";
import { AnyObject, AnyFunction } from "./types";

export enum EVENT_OPERATION_STATUS {
  SUCCESS = "success",
  FAILED = "failed",
}

export const verifyCallback =
  (callback: AnyFunction | undefined) =>
  (...arg: Array<unknown>): void => {
    if (is(Function, callback)) callback(...arg);
  };

export const createSocketCallbackPayload = ({
  data,
  metadata,
}: {
  data?: AnyObject;
  metadata: { message?: string; status: EVENT_OPERATION_STATUS };
}) => {
  data = isNil(data) ? {} : data;
  return {
    data,
    metadata,
  };
};
