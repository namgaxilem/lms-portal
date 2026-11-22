import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, defaultLocale, isLocale, type Locale } from "./config";
import { translator, type TFn } from "./translate";

/** Read the chosen locale from the cookie (server side), default Vietnamese. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

/** The translation function for this request's locale (server components, metadata). */
export async function getT(): Promise<TFn> {
  return translator(await getLocale());
}
