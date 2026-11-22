"use client";
import { Megaphone } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Card, EmptyState, QueryState, RichText, Skeleton } from "@/components/ui";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDateTime, nameSeed, timeAgo } from "@/lib/format";
import type { NewsItem } from "@/lib/moodle/hooks";

function NewsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <Skeleton className="mt-4 h-12 w-full" />
        </Card>
      ))}
    </div>
  );
}

/** Announcements tab: posts of the course news forum, newest first. */
export function NewsPanel({ items, loading, error }: { items: NewsItem[]; loading: boolean; error: string | null }) {
  const t = useT();
  const { locale } = useLocale();
  return (
    <QueryState loading={loading} error={error} skeleton={<NewsSkeleton />}>
      {items.length === 0 ? (
        <Card>
          <EmptyState icon={Megaphone} title={t("course.news.empty")} hint={t("course.news.emptyHint")} />
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="p-5">
                <article aria-labelledby={`news-${item.id}`}>
                  <header className="flex items-center gap-3">
                    <UserAvatar name={item.author} id={nameSeed(item.author)} src={item.authorPicture} size={40} />
                    <div className="min-w-0">
                      <h2 id={`news-${item.id}`} className="font-bold text-fg">
                        {item.subject}
                      </h2>
                      <p className="text-xs text-subtle">
                        {item.author} ·{" "}
                        <time dateTime={new Date(item.time * 1000).toISOString()} title={formatDateTime(item.time, locale)}>
                          {timeAgo(item.time, locale)}
                        </time>
                      </p>
                    </div>
                  </header>
                  <RichText html={item.message} className="mt-3" />
                </article>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </QueryState>
  );
}
