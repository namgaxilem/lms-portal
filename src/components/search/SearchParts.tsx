"use client";
import type { ReactNode } from "react";
import { useT } from "@/i18n/I18nProvider";
import { resultCount, type MatchRange, type SearchState } from "@/lib/search-client";

/* Pieces shared by the top-bar search palette and the /search page. */

/** `text` with the query matches marked. */
export function Highlight({ text, ranges }: { text: string; ranges: MatchRange[] }) {
  if (!ranges.length) return <>{text}</>;
  const parts: ReactNode[] = [];
  let at = 0;
  ranges.forEach(([start, end], i) => {
    if (start < at || end > text.length) return;
    if (start > at) parts.push(text.slice(at, start));
    parts.push(
      <mark key={i} className="rounded-[4px] bg-amber-200/80 text-inherit dark:bg-amber-400/30">
        {text.slice(start, end)}
      </mark>
    );
    at = end;
  });
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}

/** Screen-reader announcement of the result count once a search has settled. */
export function SearchStatus({ search, searching }: { search: SearchState; searching: boolean }) {
  const t = useT();
  const count = resultCount(search.data);
  let text = "";
  if (searching && !search.loading) {
    if (search.error) text = t("common.errorTitle");
    else if (count === 1) text = t("search.resultCountOne");
    else if (count) text = t("search.resultCount", { count });
    else text = t("search.noResults");
  }
  return (
    <p role="status" className="sr-only">
      {text}
    </p>
  );
}

/** Unread marker: a brand dot plus text for screen readers. */
export function UnreadDot() {
  const t = useT();
  return (
    <>
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-primary" />
      <span className="sr-only">{t("search.unread")}</span>
    </>
  );
}
