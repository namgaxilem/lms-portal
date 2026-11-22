"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { portalJson, portalMessage } from "@/lib/client-api";

/** Shortest query that is searched (the API enforces the same minimum). */
const MIN_QUERY = 2;
/** Longest query sent; the API cuts longer ones to the same length. */
const MAX_QUERY = 100;
const DEBOUNCE_MS = 250;

export function isSearchable(query: string) {
  return query.trim().length >= MIN_QUERY;
}

/**
 * True when the query has diacritics (or đ). People are matched by Moodle,
 * which is accent-sensitive on MySQL/MariaDB, so unaccented queries rarely
 * find names.
 */
export function hasAccents(query: string) {
  return /\p{M}/u.test(query.normalize("NFD")) || /[đĐ]/.test(query);
}

/* ---------------- /api/search payload ---------------- */

/** [start, end) offsets of a query match inside a string, for highlighting. */
export type MatchRange = [number, number];

export interface CourseHit {
  id: number;
  fullname: string;
  shortname: string;
  /** Category name (a class or slot on HVTC); "" when unknown. */
  category: string;
  courseimage?: string;
  /** Completion %, or null when Moodle tracks no completion for this user. */
  progress: number | null;
  hl: { fullname: MatchRange[]; shortname: MatchRange[] };
}

export interface PersonHit {
  id: number;
  fullname: string;
  profileimageurl?: string;
  /** In the user's Moodle contacts. */
  contact: boolean;
  hl: { fullname: MatchRange[] };
}

export interface NotificationHit {
  id: number;
  subject: string;
  /** Plain-text excerpt of the message around the first match. */
  snippet: string;
  /** Moodle component that sent it, e.g. "mod_quiz", "mod_forum", "moodle". */
  component: string;
  /** Message provider, e.g. "coursecompleted" (see notificationMeta). */
  eventtype: string;
  timecreated: number;
  read: boolean;
  hl: { subject: MatchRange[]; snippet: MatchRange[] };
}

/** A Moodle global search document that opens a portal page. */
export interface ContentHit {
  key: string;
  href: string;
  title: string;
  snippet: string;
  /** Course full name ("" for site-level documents). */
  course: string;
  /** e.g. "mod_forum", "mod_page", "core_course". */
  component: string;
  timemodified: number;
  hl: { title: MatchRange[]; snippet: MatchRange[] };
}

export interface SearchPayload {
  query: string;
  /** Most hits returned per group; a group this long may have more. */
  limit: number;
  courses: CourseHit[];
  people: PersonHit[];
  notifications: NotificationHit[];
  /** Global search hits; null when not requested or the site has no global search. */
  content: ContentHit[] | null;
}

export function resultCount(r: SearchPayload | null): number {
  if (!r) return 0;
  return r.courses.length + r.people.length + r.notifications.length + (r.content?.length ?? 0);
}

function isPayload(v: unknown): v is SearchPayload {
  if (!v || typeof v !== "object") return false;
  const p = v as Partial<Record<keyof SearchPayload, unknown>>;
  return (
    typeof p.query === "string" &&
    typeof p.limit === "number" &&
    Array.isArray(p.courses) &&
    Array.isArray(p.people) &&
    Array.isArray(p.notifications) &&
    (p.content === null || Array.isArray(p.content))
  );
}

/* ---------------- useSearch ---------------- */

interface Result {
  key: string;
  data: SearchPayload | null;
  error: string | null;
}

/**
 * Debounced global search. Hits /api/search 250ms after the query settles and
 * aborts in-flight requests when it changes. Queries shorter than MIN_QUERY
 * resolve to nothing without a network call. While a new query loads, the
 * previous results stay in `data` (`loading` is true, and `stale` is true when
 * they belong to another query); after a failure `data` is null. `full` asks
 * for the /search page: more hits per group, plus Moodle global search hits
 * where the site supports them.
 */
export function useSearch(query: string, { full = false }: { full?: boolean } = {}) {
  // Exactly what the API echoes back as `query`.
  const q = query.trim().slice(0, MAX_QUERY).trim();
  const active = isSearchable(q);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result>({ key: "", data: null, error: null });
  const key = `${full ? 1 : 0}:${attempt}:${q}`;

  useEffect(() => {
    if (!active) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q });
        if (full) params.set("full", "1");
        const json = await portalJson(`/api/search?${params}`, { signal: ctrl.signal });
        if (!isPayload(json)) throw new Error(portalMessage("common.requestFailed"));
        setResult({ key, data: json, error: null });
      } catch (e) {
        if (!ctrl.signal.aborted) setResult({ key, data: null, error: (e as Error).message });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [active, key, q, full]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!active) return { data: null, loading: false, stale: false, error: null, retry };
  const settled = result.key === key;
  const stale = result.data !== null && result.data.query !== q;
  return { data: result.data, loading: !settled, stale, error: settled ? result.error : null, retry };
}

export type SearchState = ReturnType<typeof useSearch>;

/* ---------------- Recent searches (localStorage, per user) ---------------- */

const RECENT_MAX = 6;
const RECENT_EVENT = "portal:recent-searches";
const NO_RECENT: string[] = [];
/** Parsed lists by storage key, so useSyncExternalStore gets a stable snapshot. */
const recentCache = new Map<string, { raw: string | null; items: string[] }>();

function readRecent(key: string): string[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return NO_RECENT; // Storage blocked (private mode, disabled site data).
  }
  const cached = recentCache.get(key);
  if (cached && cached.raw === raw) return cached.items;
  let items = NO_RECENT;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      items = parsed.filter((v): v is string => typeof v === "string" && isSearchable(v)).slice(0, RECENT_MAX);
    }
  } catch {
    // Corrupted entry: start over.
  }
  recentCache.set(key, { raw, items });
  return items;
}

function writeRecent(key: string, items: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Storage full or blocked: recent searches are a convenience, skip them.
  }
  window.dispatchEvent(new Event(RECENT_EVENT));
}

function subscribeRecent(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(RECENT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RECENT_EVENT, onChange);
  };
}

/**
 * The user's last searches, newest first, kept in this browser only. Keyed by
 * user id so people sharing a computer don't see each other's searches.
 */
export function useRecentSearches(userId: number) {
  const key = `portal.recent-searches.${userId}`;
  const items = useSyncExternalStore(subscribeRecent, () => readRecent(key), () => NO_RECENT);

  const add = useCallback(
    (query: string) => {
      const q = query.trim().replace(/\s+/g, " ");
      if (!isSearchable(q)) return;
      const same = q.toLocaleLowerCase();
      const rest = readRecent(key).filter((s) => s.toLocaleLowerCase() !== same);
      writeRecent(key, [q, ...rest].slice(0, RECENT_MAX));
    },
    [key]
  );
  const clear = useCallback(() => writeRecent(key, []), [key]);

  return { items, add, clear };
}
