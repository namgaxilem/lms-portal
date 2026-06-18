import "server-only";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, type Locale } from "./config";

/** Read the chosen locale from the cookie (server side), default Vietnamese. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get("lang")?.value;
  return isLocale(value) ? value : defaultLocale;
}
