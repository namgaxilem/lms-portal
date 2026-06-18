"use client";
import { createContext, useContext, useMemo, useState } from "react";
import en from "./dictionaries/en";
import vi from "./dictionaries/vi";
import { LANG_COOKIE, type Locale } from "./config";

const DICTS = { en, vi } as const;

/** Resolve a dot-path key against a dictionary, then fill {param} placeholders. */
function translate(
  dict: object,
  key: string,
  params?: Record<string, string | number>
): string {
  const value = key
    .split(".")
    .reduce<unknown>(
      (o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined),
      dict
    );
  let str = typeof value === "string" ? value : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}

type TFn = (key: string, params?: Record<string, string | number>) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFn;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const value = useMemo<I18nContextValue>(() => {
    const setLocale = (next: Locale) => {
      setLocaleState(next);
      document.cookie = `${LANG_COOKIE}=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      document.documentElement.lang = next;
    };
    const t: TFn = (key, params) => translate(DICTS[locale], key, params);
    return { locale, setLocale, t };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}

/** Returns the translation function `t`. */
export function useT() {
  return useI18n().t;
}

/** Returns the active locale and a setter. */
export function useLocale() {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}
