"use client";
import { createContext, useContext, useMemo, useState } from "react";
import { LANG_COOKIE, type Locale } from "./config";
import { translator, type TFn } from "./translate";

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
    return { locale, setLocale, t: translator(locale) };
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
