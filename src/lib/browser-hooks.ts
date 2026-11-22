"use client";
import { useCallback, useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";

/** Live `matchMedia` result; false during server rendering. */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** Current unix time (seconds), refreshed every `intervalMs` so countdowns and statuses stay right. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Calls `callback` every `ms` while the tab is visible, and once more when the
 * tab becomes visible again, so background tabs never poll Moodle.
 */
export function useVisibleInterval(callback: () => void, ms: number, enabled = true) {
  const onTick = useEffectEvent(() => {
    if (document.visibilityState === "visible") callback();
  });

  useEffect(() => {
    if (!enabled) return;
    const handler = () => onTick();
    const id = window.setInterval(handler, ms);
    document.addEventListener("visibilitychange", handler);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", handler);
    };
  }, [ms, enabled]);
}
