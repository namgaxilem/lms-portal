"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/I18nProvider";
import { useSearch, hasResults } from "@/lib/search-client";
import { MaterialIcon } from "@/components/MaterialIcon";
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
        <MaterialIcon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
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
          className="w-full rounded-full border-none bg-surface-container-low py-2 pl-10 pr-4 font-body-sm text-body-sm outline-none transition-all focus:ring-2 focus:ring-primary"
        />
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest card-elevation">
          <div className="max-h-[70vh] overflow-y-auto py-2">
            {loading && !data ? (
              <p className="px-4 py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
                {t("common.loading")}
              </p>
            ) : !hasResults(data) ? (
              <p className="px-4 py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
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
                        icon="school"
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
                        avatar={<UserAvatar name={u.fullname} id={u.id} size={36} />}
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
                        onClick={() => go("/notifications")}
                        icon="campaign"
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
            className="flex w-full items-center justify-center gap-1 border-t border-outline-variant/20 px-4 py-3 font-label-md text-label-md font-semibold text-primary transition-colors hover:bg-surface-container"
          >
            {t("search.viewAll")}
            <MaterialIcon name="arrow_forward" className="!text-sm" />
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
    <div className="py-1">
      <p className="px-4 py-1 font-label-md text-label-md uppercase tracking-wide text-outline">
        {label}
      </p>
      {children}
    </div>
  );
}

function Row({
  onClick,
  icon,
  avatar,
  title,
  subtitle,
}: {
  onClick: () => void;
  icon?: string;
  avatar?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-container"
    >
      {avatar ?? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container/10 text-primary">
          <MaterialIcon name={icon ?? "search"} className="!text-lg" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-body-sm text-body-sm font-semibold text-on-surface">
          {title}
        </p>
        {subtitle && (
          <p className="truncate text-xs text-on-surface-variant">{subtitle}</p>
        )}
      </div>
    </button>
  );
}
