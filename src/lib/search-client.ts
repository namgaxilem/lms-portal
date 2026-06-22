"use client";
import { useEffect, useState } from "react";
import type { SearchResults } from "@/lib/moodle/types";

interface State {
  data: SearchResults | null;
  loading: boolean;
}

/**
 * Debounced global search. Hits /api/search 250ms after the query settles and
 * aborts in-flight requests when the query changes. Queries shorter than two
 * characters resolve to no results without a network call.
 */
export function useSearch(query: string): State {
  const [state, setState] = useState<State>({ data: null, loading: false });
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2) {
      setState({ data: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const json = (await res.json()) as SearchResults;
        setState({ data: json, loading: false });
      } catch {
        if (!ctrl.signal.aborted) setState({ data: null, loading: false });
      }
    }, 250);

    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q]);

  return state;
}

export function hasResults(r: SearchResults | null): boolean {
  return Boolean(
    r && (r.courses.length || r.notifications.length || r.users.length)
  );
}
