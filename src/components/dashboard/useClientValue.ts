"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * A value that depends on the browser's clock or time zone (greeting, today's
 * date, tip of the day). It is null on the server and during hydration, so the
 * server HTML and the first client render match even when their time zones
 * differ. `read` must return a primitive that is stable between calls.
 */
export function useClientValue<T extends string | number>(read: () => T): T | null {
  return useSyncExternalStore<T | null>(subscribe, read, () => null);
}
