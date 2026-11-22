"use client";
import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type RefObject } from "react";

/**
 * Lets an element fill the rest of the viewport below the app chrome. Its
 * distance from the top of the document plus the parent's bottom padding (room
 * for the mobile tab bar) is written to `--chrome-offset`, so the height follows
 * whatever paddings the app shell uses instead of hard-coded numbers.
 */
export function useViewportFill(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      if (document.fullscreenElement === el) return;
      const parent = el.parentElement;
      const below = parent ? parseFloat(getComputedStyle(parent).paddingBottom) || 0 : 0;
      const above = el.getBoundingClientRect().top + window.scrollY;
      el.style.setProperty("--chrome-offset", `${Math.round(above + below)}px`);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [ref]);
}

const noSubscribe = () => () => {};

/** Element fullscreen (unsupported on iPhone Safari, where `supported` is false). */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const supported = useSyncExternalStore(
    noSubscribe,
    () => !!document.fullscreenEnabled,
    () => false
  );
  const [active, setActive] = useState(false);
  useEffect(() => {
    const onChange = () => setActive(!!ref.current && document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [ref]);
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else ref.current?.requestFullscreen().catch(() => {});
  };
  return { supported, active, toggle };
}
