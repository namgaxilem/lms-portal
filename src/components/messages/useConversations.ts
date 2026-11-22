"use client";
import { useCallback, useEffect, useState } from "react";
import { moodleCached } from "@/lib/client-api";
import type { MoodleConversation } from "./types";

const PAGE = 50;
/** Short cache so moving between conversations (each a new page) shows the list at once. */
const CACHE_MS = 30_000;

interface ListState {
  list: MoodleConversation[];
  limit: number;
}

/**
 * The user's conversations, most recent first, growing by 50 with `loadMore`.
 * `refresh` re-reads silently (polling, after sending or marking read) and
 * keeps the last good list when it fails.
 */
export function useConversations(userId: number) {
  const [state, setState] = useState<ListState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchList = useCallback(
    (limitnum: number, refresh: boolean) =>
      moodleCached<{ conversations: MoodleConversation[] }>(
        "core_message_get_conversations",
        { userid: userId, limitfrom: 0, limitnum },
        CACHE_MS,
        { refresh }
      ).then((r) => r?.conversations ?? []),
    [userId]
  );

  useEffect(() => {
    let cancelled = false;
    fetchList(PAGE, false).then(
      (list) => !cancelled && setState({ list, limit: PAGE }),
      (e: Error) => !cancelled && setError(e.message)
    );
    return () => {
      cancelled = true;
    };
  }, [fetchList]);

  const limit = state?.limit ?? PAGE;

  /*
   * Requests can overlap (a poll while "show more" is loading): a result
   * fetched for a smaller page than the one now shown is dropped, so the list
   * never shrinks back.
   */
  const apply = useCallback((list: MoodleConversation[], requested: number) => {
    setState((s) => (s && s.limit > requested ? s : { list, limit: requested }));
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await fetchList(limit, true), limit);
      setError(null);
    } catch {
      /* Keep showing the last good list. */
    }
  }, [apply, fetchList, limit]);

  /** Loads 50 more; throws so the caller can report the failure. */
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const next = limit + PAGE;
      apply(await fetchList(next, true), next);
    } finally {
      setLoadingMore(false);
    }
  }, [apply, fetchList, limit]);

  const list = state?.list ?? [];
  return {
    conversations: list,
    loading: !state && !error,
    error: state ? null : error,
    hasMore: !!state && list.length >= state.limit,
    loadingMore,
    loadMore,
    refresh,
  };
}
