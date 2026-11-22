"use client";
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "theme";

interface ThemeContextValue {
  dark: boolean;
  toggle: () => void;
  setDark: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/* The source of truth is the `dark` class on <html>: an inline script in the
   root layout sets it before paint from localStorage / the system preference,
   and setDark() below updates it. React subscribes to it as an external store,
   so there is no flash and no state to sync in effects. */
const listeners = new Set<() => void>();
const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};
const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

function setDark(value: boolean) {
  document.documentElement.classList.toggle("dark", value);
  try {
    localStorage.setItem(STORAGE_KEY, value ? "dark" : "light");
  } catch {
    // Storage unavailable (private mode): the choice lasts for this page only.
  }
  listeners.forEach((l) => l());
}

/**
 * The phone browser's bar continues the school-coloured top bar in the chosen
 * theme: the root layout's viewport.themeColor only follows the system preference.
 */
function syncThemeColor() {
  const color = getComputedStyle(document.documentElement).getPropertyValue("--c-sidebar").trim();
  if (!color) return;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = color;
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(syncThemeColor, [dark]);
  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(!dark), setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
