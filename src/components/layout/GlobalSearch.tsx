"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/I18nProvider";
import { useSearch, hasResults } from "@/lib/search-client";
import { ArrowRight, BookOpen, Megaphone, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

/**
 * Top-bar global search. Debounced live preview grouped by type (courses,
 * people, notifications) with a footer link to the dedicated /search page.
 * Each result navigates to its canonical destination.
 */
export function GlobalSearch() {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const { data, loading } = useSearch(q);

  // Close on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  function submit() {
    const query = q.trim();
    if (query.length < 2) return;
    go(`/search?q=${encodeURIComponent(query)}`);
  }

  const showPanel = open && q.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
        />
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={t("search.placeholder")}
          className="h-9 w-full rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-sm text-fg outline-none transition-[border-color,background-color,box-shadow] placeholder:text-subtle hover:border-line-strong focus:border-primary focus:bg-surface focus:ring-4 focus:ring-ring/30"
        />
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-pop animate-fade-in">
          <div className="max-h-[70vh] overflow-y-auto p-1.5">
            {loading && !data ? (
              <p className="px-4 py-8 text-center text-[13px] text-subtle">
                {t("common.loading")}
              </p>
            ) : !hasResults(data) ? (
              <p className="px-4 py-8 text-center text-[13px] text-subtle">
                {t("search.noResults")}
              </p>
            ) : (
              <>
                {data!.courses.length > 0 && (
                  <Group label={t("search.courses")}>
                    {data!.courses.map((c) => (
                      <Row
                        key={`c${c.id}`}
                        onClick={() => go(`/courses/${c.id}`)}
                        icon={BookOpen}
                        title={c.fullname}
                        subtitle={c.shortname}
                      />
                    ))}
                  </Group>
                )}

                {data!.users.length > 0 && (
                  <Group label={t("search.people")}>
                    {data!.users.map((u) => (
                      <Row
                        key={`u${u.id}`}
                        onClick={() => go(`/messages/${u.id}`)}
                        avatar={<UserAvatar name={u.fullname} id={u.id} size={32} />}
                        title={u.fullname}
                        subtitle={t("nav.messages")}
                      />
                    ))}
                  </Group>
                )}

                {data!.notifications.length > 0 && (
                  <Group label={t("search.notifications")}>
                    {data!.notifications.map((n) => (
                      <Row
                        key={`n${n.id}`}
                        onClick={() => go(`/notifications/${n.id}`)}
                        icon={Megaphone}
                        title={n.subject}
                        subtitle={n.smallmessage}
                      />
                    ))}
                  </Group>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={submit}
            className="flex w-full items-center justify-center gap-1.5 border-t border-line px-4 py-2.5 text-[13px] font-medium text-primary-text transition-colors hover:bg-surface-2"
          >
            {t("search.viewAll")}
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="px-3 pb-1 pt-2 text-xs font-medium text-subtle">
        {label}
      </p>
      {children}
    </div>
  );
}

function Row({
  onClick,
  icon: Icon = Search,
  avatar,
  title,
  subtitle,
}: {
  onClick: () => void;
  icon?: LucideIcon;
  avatar?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-2"
    >
      {avatar ?? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-muted">
          <Icon size={16} strokeWidth={1.75} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">
          {title}
        </p>
        {subtitle && (
          <p className="truncate text-xs text-subtle">{subtitle}</p>
        )}
      </div>
    </button>
  );
}
