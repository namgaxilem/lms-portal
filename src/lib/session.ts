import "server-only";
import { cookies } from "next/headers";
import type { SessionUser } from "./moodle/types";

const TOKEN_COOKIE = "mdl_token";
const USER_COOKIE = "mdl_user";
/** Legacy view-role cookie; only deleted now (role switching was removed). */
const LEGACY_ROLE_COOKIE = "mdl_view";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}

export async function setSession(token: string, user: SessionUser) {
  const store = await cookies();
  store.set(TOKEN_COOKIE, token, cookieOptions());
  store.set(USER_COOKIE, JSON.stringify(user), cookieOptions());
}

export async function getToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(USER_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
  store.delete(USER_COOKIE);
  store.delete(LEGACY_ROLE_COOKIE);
}
