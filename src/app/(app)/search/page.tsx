"use client";
import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Bell, BookOpen, ChevronRight, Search, SearchX } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useSearch, hasResults } from "@/lib/search-client";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Card,
  CardHeader,
  EmptyState,
  Input,
  PageHeader,
  QueryState,
  Tabs,
} from "@/components/ui";

type Group = "all" | "courses" | "people" | "notifications";

interface ResultRow {
  key: string;
  href: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  avatar?: ReactNode;
}

function SearchResultsView() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [tab, setTab] = useState<Group>("all");
  const { data, loading } = useSearch(q);

  function submit(next: string) {
    const query = next.trim();
    router.replace(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  const groups: { key: Exclude<Group, "all">; title: string; rows: ResultRow[] }[] =
    data
      ? [
          {
            key: "courses",
            title: t("search.courses"),
            rows: data.courses.map((c) => ({
              key: `c${c.id}`,
              href: `/courses/${c.id}`,
              icon: BookOpen,
              title: c.fullname,
              subtitle: c.shortname,
            })),
          },
          {
            key: "people",
            title: t("search.people"),
            rows: data.users.map((u) => ({
              key: `u${u.id}`,
              href: `/messages/${u.id}`,
              avatar: <UserAvatar name={u.fullname} id={u.id} size={36} />,
              title: u.fullname,
              subtitle: t("nav.messages"),
            })),
          },
          {
            key: "notifications",
            title: t("search.notifications"),
            rows: data.notifications.map((n) => ({
              key: `n${n.id}`,
              href: `/notifications/${n.id}`,
              icon: Bell,
              title: n.subject,
              subtitle: n.smallmessage,
            })),
          },
        ]
      : [];

  const total = groups.reduce((s, g) => s + g.rows.length, 0);
  const visible = groups.filter(
    (g) => g.rows.length > 0 && (tab === "all" || g.key === tab)
  );
  const trimmed = q.trim();

  return (
    <div>
      <PageHeader
        title={t("search.title")}
        description={
          trimmed.length >= 2 ? t("search.resultsFor", { q: trimmed }) : undefined
        }
      />

      <div className="space-y-6">
        <Input
          autoFocus
          type="search"
          icon={Search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit(q)}
          placeholder={t("search.placeholder")}
          aria-label={t("search.title")}
          className="h-11 text-[15px]"
        />

        {trimmed.length < 2 ? (
          <Card>
            <EmptyState icon={Search} title={t("search.prompt")} />
          </Card>
        ) : (
          <QueryState loading={loading && !data} error={null}>
            {!hasResults(data) ? (
              <Card>
                <EmptyState icon={SearchX} title={t("search.noResults")} />
              </Card>
            ) : (
              <div className="space-y-6">
                <Tabs<Group>
                  value={tab}
                  onChange={setTab}
                  items={[
                    { key: "all", label: t("search.all"), count: total },
                    ...groups.map((g) => ({
                      key: g.key,
                      label: g.title,
                      count: g.rows.length,
                    })),
                  ]}
                />

                {visible.length === 0 ? (
                  <Card>
                    <EmptyState icon={SearchX} title={t("search.noResults")} />
                  </Card>
                ) : (
                  visible.map((g) => (
                    <Card key={g.key} className="animate-fade-in-up overflow-hidden">
                      {tab === "all" && <CardHeader title={g.title} />}
                      <ul className="divide-y divide-line">
                        {g.rows.map((r) => (
                          <li key={r.key}>
                            <ResultLink row={r} />
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ))
                )}
              </div>
            )}
          </QueryState>
        )}
      </div>
    </div>
  );
}

function ResultLink({ row }: { row: ResultRow }) {
  const Icon = row.icon ?? Search;
  return (
    <Link
      href={row.href}
      className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2"
    >
      {row.avatar ?? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-muted">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{row.title}</p>
        {row.subtitle && (
          <p className="truncate text-[13px] text-subtle">{row.subtitle}</p>
        )}
      </div>
      <ChevronRight
        size={16}
        strokeWidth={1.75}
        className="shrink-0 text-subtle transition-colors group-hover:text-fg"
      />
    </Link>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResultsView />
    </Suspense>
  );
}
