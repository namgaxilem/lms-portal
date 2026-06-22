"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/i18n/I18nProvider";
import { useSearch, hasResults } from "@/lib/search-client";
import { QueryState } from "@/components/ui/QueryState";
import { MaterialIcon } from "@/components/MaterialIcon";
import { UserAvatar } from "@/components/UserAvatar";

function SearchResultsView() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const { data, loading } = useSearch(q);

  function submit(next: string) {
    const query = next.trim();
    router.replace(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  return (
    <div className="space-y-gutter">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/10 text-primary">
          <MaterialIcon name="search" fill />
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface">
          {t("search.title")}
        </h2>
      </div>

      <div className="relative">
        <MaterialIcon
          name="search"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline"
        />
        <input
          autoFocus
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit(q)}
          placeholder={t("search.placeholder")}
          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-3 pl-12 pr-4 font-body-md text-body-md outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {q.trim().length < 2 ? (
        <Empty icon="search" text={t("search.prompt")} />
      ) : (
        <QueryState loading={loading && !data} error={null}>
          {!hasResults(data) ? (
            <Empty icon="search_off" text={t("search.noResults")} />
          ) : (
            <div className="space-y-gutter">
              {data!.courses.length > 0 && (
                <Section title={t("search.courses")}>
                  {data!.courses.map((c) => (
                    <Row
                      key={`c${c.id}`}
                      href={`/courses/${c.id}`}
                      icon="school"
                      title={c.fullname}
                      subtitle={c.shortname}
                    />
                  ))}
                </Section>
              )}

              {data!.users.length > 0 && (
                <Section title={t("search.people")}>
                  {data!.users.map((u) => (
                    <Row
                      key={`u${u.id}`}
                      href={`/messages/${u.id}`}
                      avatar={<UserAvatar name={u.fullname} id={u.id} />}
                      title={u.fullname}
                      subtitle={t("nav.messages")}
                    />
                  ))}
                </Section>
              )}

              {data!.notifications.length > 0 && (
                <Section title={t("search.notifications")}>
                  {data!.notifications.map((n) => (
                    <Row
                      key={`n${n.id}`}
                      href="/notifications"
                      icon="campaign"
                      title={n.subject}
                      subtitle={n.smallmessage}
                    />
                  ))}
                </Section>
              )}
            </div>
          )}
        </QueryState>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-label-md text-label-md uppercase tracking-wide text-outline">
        {title}
      </h3>
      <div className="divide-y divide-outline-variant/15 overflow-hidden rounded-xl bg-surface-container-lowest card-elevation">
        {children}
      </div>
    </div>
  );
}

function Row({
  href,
  icon,
  avatar,
  title,
  subtitle,
}: {
  href: string;
  icon?: string;
  avatar?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 p-3 transition-colors hover:bg-surface-container"
    >
      {avatar ?? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container/10 text-primary">
          <MaterialIcon name={icon ?? "search"} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-body-md text-body-md font-semibold text-on-surface">
          {title}
        </p>
        {subtitle && (
          <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
            {subtitle}
          </p>
        )}
      </div>
      <MaterialIcon
        name="chevron_right"
        className="shrink-0 text-outline transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-surface-container-lowest p-lg text-center card-elevation">
      <MaterialIcon name={icon} className="!text-5xl text-outline-variant" />
      <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
        {text}
      </p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResultsView />
    </Suspense>
  );
}
