import type { NewsItem } from "@/lib/moodle/hooks";

/**
 * Announcements posted since `since`. Only the first `perForum` posts of each
 * forum are fetched, pinned ones first (Moodle sorts them ahead of newer
 * posts), so `capped` means a forum may have more recent posts than counted:
 * its page was full and held no unpinned post older than `since`.
 */
export function countRecentNews(items: NewsItem[], since: number, perForum: number) {
  const byForum = new Map<number, NewsItem[]>();
  for (const n of items) byForum.set(n.forumCmid, [...(byForum.get(n.forumCmid) ?? []), n]);
  let count = 0;
  let capped = false;
  for (const posts of byForum.values()) {
    count += posts.filter((n) => n.time >= since).length;
    if (posts.length >= perForum && !posts.some((n) => !n.pinned && n.time < since)) capped = true;
  }
  return { count, capped };
}
