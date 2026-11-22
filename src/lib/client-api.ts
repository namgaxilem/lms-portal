"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { defaultLocale, isLocale } from "@/i18n/config";
import { translator } from "@/i18n/translate";
import { decodeMoodleText } from "@/lib/format";

/**
 * Error from a portal API route (/api/moodle and friends). `errorcode` is
 * Moodle's (e.g. "nopermissions", "invalidrecord"); `status` is the route's
 * HTTP status (502 = Moodle unreachable, 0 = the portal itself unreachable).
 */
export class MoodleRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errorcode?: string
  ) {
    super(message);
    this.name = "MoodleRequestError";
  }
}

/** A message the portal itself words, in the page's language (Moodle's own errors arrive in it already). */
export function portalMessage(key: string) {
  const lang = typeof document === "undefined" ? defaultLocale : document.documentElement.lang;
  return translator(isLocale(lang) ? lang : defaultLocale)(key);
}

/**
 * Fetch a portal API route and return its JSON body. A 401 sends the user back
 * to login (the session ended); any other failure throws a MoodleRequestError.
 */
export async function portalJson(input: string, init?: RequestInit): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (e) {
    if (init?.signal?.aborted) throw e;
    throw new MoodleRequestError(portalMessage("auth.errors.unreachable"), 0);
  }
  if (res.status === 401) redirectToLogin();
  const json: Record<string, unknown> = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      res.status === 401
        ? portalMessage("auth.sessionExpired")
        : res.status === 502
          ? portalMessage("auth.errors.unreachable")
          : typeof json.error === "string"
            ? json.error
            : portalMessage("common.requestFailed");
    throw new MoodleRequestError(message, res.status, typeof json.errorcode === "string" ? json.errorcode : undefined);
  }
  return json;
}

/**
 * Call a Moodle web service function through the authenticated proxy.
 * `keepalive` lets the request outlive the page (used to flush SCORM tracks on unload).
 * `filter: false` returns text as stored, for forms that save it back (see moodleCall).
 * Plain-text fields (names, titles…) come back with HTML entities decoded.
 */
export async function moodleClient<T = unknown>(
  wsfunction: string,
  args: Record<string, unknown> = {},
  { keepalive = false, filter = true }: { keepalive?: boolean; filter?: boolean } = {}
): Promise<T> {
  const body = JSON.stringify({ wsfunction, args, ...(filter ? {} : { filter: false }) });
  const json = await portalJson("/api/moodle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    // Browsers cap keepalive bodies at 64KB; fall back to a normal request above that.
    keepalive: keepalive && body.length < 60_000,
  });
  return decodeMoodleText(json.data) as T;
}

let redirecting = false;

/** The session ended (expired Moodle token or cookies gone): back to login, once. */
export function redirectToLogin() {
  if (redirecting || typeof window === "undefined") return;
  redirecting = true;
  window.location.assign("/login?expired=1");
}

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/* Short-lived cache for read calls shared by several components on a page
   (e.g. the enrolled-course list used by the shell and the dashboard). Entries
   hold the in-flight promise, so concurrent identical calls are deduplicated.
   It lives as long as the page, so signing out and in reloads the page. */
const cache = new Map<string, { at: number; promise: Promise<unknown> }>();

/** Readers of a cache key, told about every new request for it (see useMoodle). */
type CacheListener = (promise: Promise<unknown>) => void;
const listeners = new Map<string, Set<CacheListener>>();

const cacheKey = (wsfunction: string, argsJson: string) => `${wsfunction}:${argsJson}`;

function subscribe(key: string, listener: CacheListener) {
  const set = listeners.get(key) ?? new Set();
  set.add(listener);
  listeners.set(key, set);
  return () => {
    set.delete(listener);
    if (!set.size) listeners.delete(key);
  };
}

/**
 * Read a web service function through the cache (`maxAgeMs` > 0) or directly.
 * `refresh` always fetches; every useMoodle reader of the same call then shows
 * the new result, so one refresh (a poll, a retry) updates the whole page.
 */
export function moodleCached<T = unknown>(
  wsfunction: string,
  args: Record<string, unknown> = {},
  maxAgeMs = 60_000,
  { refresh = false }: { refresh?: boolean } = {}
): Promise<T> {
  const key = cacheKey(wsfunction, JSON.stringify(args));
  const hit = cache.get(key);
  if (!refresh && hit && Date.now() - hit.at < maxAgeMs) return hit.promise as Promise<T>;
  const promise = moodleClient<T>(wsfunction, args);
  cache.set(key, { at: Date.now(), promise });
  promise.catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key);
  });
  listeners.get(key)?.forEach((listener) => listener(promise));
  return promise;
}

/**
 * Fetch a web service function and track loading/error state. Re-runs whenever
 * `wsfunction` or the serialized `args` change. Pass `skip` to defer the call.
 * `cacheMs` shares the result with other components for that long, and the
 * state follows any newer successful read of the same call made elsewhere;
 * `reload()` always fetches fresh data.
 */
export function useMoodle<T = unknown>(
  wsfunction: string,
  args: Record<string, unknown> = {},
  skip = false,
  { cacheMs = 0 }: { cacheMs?: number } = {}
) {
  const [state, setState] = useState<State<T>>({
    data: null,
    error: null,
    loading: !skip,
  });
  const argsKey = JSON.stringify(args);
  // Only the latest request may update state, so a slow response for old
  // args never overwrites the result for the current ones.
  const latest = useRef(0);

  // Follow reads of the same cached call started elsewhere (another component's
  // retry, the shell's unread poll…); failures there leave this state alone.
  // This hook's own reads arrive here too and simply set the same result.
  useEffect(() => {
    if (skip || cacheMs <= 0) return;
    return subscribe(cacheKey(wsfunction, argsKey), (promise) => {
      const id = latest.current;
      promise.then(
        (data) => id === latest.current && setState({ data: data as T, error: null, loading: false }),
        () => {}
      );
    });
  }, [wsfunction, argsKey, cacheMs, skip]);

  const load = useCallback(
    async (refresh: boolean) => {
      const id = ++latest.current;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const parsed = JSON.parse(argsKey);
        const data = cacheMs > 0
          ? await moodleCached<T>(wsfunction, parsed, cacheMs, { refresh })
          : await moodleClient<T>(wsfunction, parsed);
        if (id === latest.current) setState({ data, error: null, loading: false });
      } catch (e) {
        if (id === latest.current) setState({ data: null, error: (e as Error).message, loading: false });
      }
    },
    [wsfunction, argsKey, cacheMs]
  );
  const run = useCallback(() => load(false), [load]);
  const reload = useCallback(() => load(true), [load]);

  useEffect(() => {
    if (skip) {
      latest.current++; // drop any in-flight response
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ data: null, error: null, loading: false });
      return;
    }
    run();
  }, [run, skip]);

  return { ...state, reload };
}

/**
 * Upload files into the user's Moodle draft area via /api/moodle/upload.
 * Pass an existing `itemid` to add to that draft area. Returns the draft itemid.
 */
export async function uploadDraftFiles(files: File[], itemid = 0): Promise<number> {
  const form = new FormData();
  for (const f of files) form.append("file", f, f.name);
  form.set("itemid", String(itemid));
  const json = await portalJson("/api/moodle/upload", { method: "POST", body: form });
  return json.itemid as number;
}
