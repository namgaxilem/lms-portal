"use client";
import { useCallback, useEffect, useState } from "react";
import { NOTIFICATIONS_CHANGED, fetchNotifications } from "@/lib/notifications";
import type { PopupNotification } from "@/lib/moodle/types";

const PAGE = 20;

interface Feed {
  items: PopupNotification[];
  unread: number;
  hasMore: boolean;
}

/**
 * The user's notifications, newest first, with "load more" paging (the web
 * service takes limit/offset). Refreshes whatever is shown when notification
 * read-state changes anywhere in the portal (NOTIFICATIONS_CHANGED).
 */
export function useNotificationFeed(userId: number) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (offset: number, limit: number): Promise<Feed> => {
      const { items, unread } = await fetchNotifications(userId, offset, limit);
      return { items, unread, hasMore: items.length === limit };
    },
    [userId]
  );

  useEffect(() => {
    let cancelled = false;
    fetchPage(0, PAGE).then(
      (page) => !cancelled && setFeed(page),
      (e: Error) => !cancelled && setError(e.message)
    );
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const shown = feed?.items.length ?? 0;

  // Re-read everything currently shown when read-state changes elsewhere.
  useEffect(() => {
    const onChange = () => {
      fetchPage(0, Math.max(shown, PAGE)).then(setFeed, () => {
        /* Keep the current list; the next change or visit refreshes it. */
      });
    };
    window.addEventListener(NOTIFICATIONS_CHANGED, onChange);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, onChange);
  }, [fetchPage, shown]);

  /** Appends the next page; throws so the caller can report the failure. */
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const page = await fetchPage(shown, PAGE);
      setFeed((f) => {
        const seen = new Set(f?.items.map((n) => n.id));
        return {
          items: [...(f?.items ?? []), ...page.items.filter((n) => !seen.has(n.id))],
          unread: page.unread,
          hasMore: page.hasMore,
        };
      });
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, shown]);

  return {
    items: feed?.items ?? [],
    unread: feed?.unread ?? 0,
    hasMore: feed?.hasMore ?? false,
    loading: !feed && !error,
    error: feed ? null : error,
    /** Loaded successfully: counts such as `unread` reflect Moodle. */
    ready: !!feed,
    loadingMore,
    loadMore,
  };
}
