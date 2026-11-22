import type { Locale } from "./config";
import en from "./dictionaries/en";
import vi from "./dictionaries/vi";

/** Looks up a dot-path key ("common.loading"), filling {param} placeholders; returns the key when missing. */
export type TFn = (key: string, params?: Record<string, string | number>) => string;

const DICTS = { en, vi } as const;

function lookup(dict: object, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), dict);
}

/** The translation function for a locale: the same lookup on the server and in the browser. */
export function translator(locale: Locale): TFn {
  const dict = DICTS[locale];
  return (key, params) => {
    const value = lookup(dict, key);
    let text = typeof value === "string" ? value : key;
    for (const [k, v] of Object.entries(params ?? {})) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  };
}
