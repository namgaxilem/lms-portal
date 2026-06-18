export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];

/** Vietnamese is the default language. */
export const defaultLocale: Locale = "vi";

export const LANG_COOKIE = "lang";

export const localeNames: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
