"use client";
import { useState } from "react";
import { Modal } from "antd";
import { Megaphone } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Button, Card, EmptyState, RichText, SectionTitle, Skeleton } from "@/components/ui";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDateTime, nameSeed, plainText, timeAgo } from "@/lib/format";
import type { NewsItem } from "@/lib/moodle/hooks";

type CourseNames = Map<number, { fullname: string; shortname: string }>;

function NewsSkeleton() {
  return (
    <div className="space-y-4 py-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NewsDetail({
  item,
  open,
  courses,
  onClose,
  afterClose,
}: {
  item: NewsItem | null;
  open: boolean;
  courses: CourseNames;
  onClose: () => void;
  afterClose: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const course = item ? courses.get(item.courseId) : undefined;
  return (
    <Modal
      open={open && !!item}
      onCancel={onClose}
      afterClose={afterClose}
      title={item?.subject}
      width={720}
      centered
      destroyOnHidden
      footer={
        item && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t("common.close")}
            </Button>
            <Button href={`/courses/${item.courseId}`} variant="secondary">
              {t("dashboard.goToCourse")}
            </Button>
          </div>
        )
      }
    >
      {item && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <UserAvatar name={item.author} id={nameSeed(item.author)} src={item.authorPicture} size={40} />
            <div className="min-w-0 text-[13px]">
              <p className="truncate font-semibold text-fg">{item.author}</p>
              <p className="truncate text-subtle">
                {[course?.fullname, formatDateTime(item.time, locale)].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <RichText html={item.message} className="max-h-[60vh] overflow-y-auto" />
        </>
      )}
    </Modal>
  );
}

/** Latest teacher announcements (course news forums), opened in a dialog. */
export function NewsCard({
  items,
  recent,
  loading,
  error,
  courses,
}: {
  /** The announcements to list, newest first. */
  items: NewsItem[];
  /** Announcements of the last 7 days (`capped`: there may be more). */
  recent: { count: number; capped: boolean };
  loading: boolean;
  error: string | null;
  courses: CourseNames;
}) {
  const t = useT();
  const { locale } = useLocale();
  // Kept until the dialog has finished closing, so its content does not vanish mid-animation.
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <section aria-labelledby="dashboard-news">
      <Card className="p-5">
        <SectionTitle
          title={<span id="dashboard-news">{t("dashboard.news")}</span>}
          action={
            recent.count > 0 && !loading && !error ? (
              <Badge tone="primary">{t("dashboard.newsRecent", { n: recent.capped ? `${recent.count}+` : recent.count })}</Badge>
            ) : undefined
          }
        />
        {loading ? (
          <NewsSkeleton />
        ) : error ? (
          <p role="alert" className="text-[13px] text-error-text">
            {t("common.errorTitle")}
          </p>
        ) : items.length === 0 ? (
          <EmptyState compact icon={Megaphone} title={t("dashboard.noNews")} />
        ) : (
          <ul className="-mx-2 space-y-1">
            {items.map((n) => {
              const course = courses.get(n.courseId);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(n);
                      setOpen(true);
                    }}
                    className="flex w-full gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <UserAvatar name={n.author} id={nameSeed(n.author)} src={n.authorPicture} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-bold leading-snug text-fg">{n.subject}</span>
                      <span className="mt-0.5 line-clamp-2 text-[13px] text-subtle">{plainText(n.message)}</span>
                      <span className="mt-1 block truncate text-xs font-medium text-subtle">
                        {[n.author, course?.shortname, timeAgo(n.time, locale)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <NewsDetail
        item={selected}
        open={open}
        courses={courses}
        onClose={() => setOpen(false)}
        afterClose={() => setSelected(null)}
      />
    </section>
  );
}
