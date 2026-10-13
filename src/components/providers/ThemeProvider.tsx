"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "theme";

interface ThemeContextValue {
  dark: boolean;
  toggle: () => void;
  setDark: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Tracks the light/dark preference, mirrors it onto `<html class="dark">` (which
 * flips the CSS variables in globals.css) and persists it to localStorage. An
 * inline script in the root layout applies the saved class before paint, so this
 * provider only needs to keep React state in sync — no flash on first load.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const hydrated = useRef(false);

  // Read the persisted (or system) preference once on mount.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(initial);
  }, []);

  // Reflect the preference onto the document + storage whenever it changes.
  // Skipped on the first run so the pre-paint class isn't wiped before the
  // saved preference is read.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  }, [dark]);

  return (
    <ThemeContext.Provider
      value={{ dark, toggle: () => setDark((d) => !d), setDark }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
