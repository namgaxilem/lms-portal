"use client";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronRight,
  FileText,
  Info,
  LoaderCircle,
  MessageCircle,
  RotateCcwClock,
  Search,
  SearchX,
  Trash,
  X,
  type LucideIcon,
} from "lucide-react";
import { CourseCover } from "@/components/CourseCover";
import { UserAvatar } from "@/components/UserAvatar";
import { CourseMark } from "@/components/courses/CourseMark";
import { notificationMeta } from "@/components/notifications/notification-meta";
import { Highlight, SearchStatus, UnreadDot } from "@/components/search/SearchParts";
import { useSession } from "@/components/providers/SessionProvider";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  IconTile,
  Input,
  PageHeader,
  Progress,
  QueryState,
  SectionTitle,
  Skeleton,
  Tabs,
  cn,
  tabPanelProps,
  type Tone,
} from "@/components/ui";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { courseStyle } from "@/lib/course-color";
import { timeAgo } from "@/lib/format";
import { moduleMeta } from "@/lib/module-meta";
import {
  hasAccents,
  isSearchable,
  resultCount,
  useRecentSearches,
  useSearch,
  type ContentHit,
  type CourseHit,
  type NotificationHit,
  type PersonHit,
  type SearchPayload,
  type SearchState,
} from "@/lib/search-client";

type Group = "courses" | "people" | "notifications" | "content";
type Tab = "all" | Group;

/** Delay before typing is written to ?q= (history.replaceState, no navigation). */
const URL_SYNC_MS = 400;
interface Look {
  icon: LucideIcon;
  tone: Tone;
}

/** A search document's look: activities ("mod_quiz") look like their module type. */
function contentLook(component: string): Look {
  if (!component.startsWith("mod_")) return { icon: FileText, tone: "neutral" };
  const { icon, tone } = moduleMeta(component.slice(4));
  return { icon, tone };
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchView />
    </Suspense>
  );
}

/**
 * The search box value, synced with ?q= both ways: typing updates the URL
 * (so back from a result restores the query), and URL changes from outside
 * (the top-bar palette, back/forward) update the box.
 */
function useUrlQuery() {
  const urlQuery = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [seenUrl, setSeenUrl] = useState(urlQuery);
  const [written, setWritten] = useState<string | null>(null);

  if (urlQuery !== seenUrl) {
    setSeenUrl(urlQuery);
    // The echo of our own replaceState must not overwrite what was typed since.
    if (urlQuery === written) setWritten(null);
    else setQuery(urlQuery);
  }

  useEffect(() => {
    const next = query.trim();
    if (next === urlQuery) return;
    const timer = setTimeout(() => {
      setWritten(next);
      window.history.replaceState(null, "", next ? `?q=${encodeURIComponent(next)}` : window.location.pathname);
    }, URL_SYNC_MS);
    return () => clearTimeout(timer);
  }, [query, urlQuery]);

  return [query, setQuery] as const;
}

function SearchView() {
  const t = useT();
  const { user } = useSession();
  const recent = useRecentSearches(user.id);
  const [query, setQuery] = useUrlQuery();
  const [tab, setTab] = useState<Tab>("all");
  const search = useSearch(query, { full: true });
  const searching = isSearchable(query);
  const remember = () => recent.add(query);

  return (
    <div>
      <PageHeader
        title={t("search.title")}
        description={searching ? t("search.resultsFor", { q: query.trim() }) : t("search.subtitle")}
      />

      <form
        role="search"
        className="mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          remember();
        }}
      >
        <Input
          autoFocus
          type="search"
          icon={Search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          aria-label={t("search.title")}
          enterKeyHint="search"
          autoComplete="off"
          className="shadow-card [&::-webkit-search-cancel-button]:appearance-none"
          trailing={
            search.loading ? (
              <span className="grid h-10 w-10 place-items-center text-subtle">
                <LoaderCircle size={16} aria-hidden className="animate-spin" />
              </span>
            ) : query ? (
              <Button variant="ghost" size="icon" aria-label={t("search.clear")} onClick={() => setQuery("")}>
                <X size={16} aria-hidden />
              </Button>
            ) : null
          }
        />
      </form>

      {searching ? (
        <Results search={search} query={query} tab={tab} onTab={setTab} onPick={remember} />
      ) : (
        <SearchStart recent={recent.items} onPick={setQuery} onClear={recent.clear} />
      )}
      <SearchStatus search={search} searching={searching} />
    </div>
  );
}

/* ---------------- Before searching ---------------- */

function SearchStart({ recent, onPick, onClear }: { recent: string[]; onPick: (q: string) => void; onClear: () => void }) {
  const t = useT();
  return (
    <div className="space-y-6">
      {recent.length > 0 && (
        <Card className="animate-fade-in-up">
          <CardHeader
            title={t("search.recent")}
            action={
              <Button variant="ghost" size="sm" onClick={onClear}>
                <Trash size={15} aria-hidden />
                {t("search.clearRecent")}
              </Button>
            }
          />
          <ul className="flex flex-wrap gap-2 px-5 pb-5 pt-3">
            {recent.map((q) => (
              <li key={q} className="min-w-0 max-w-full">
                <button
                  type="button"
                  onClick={() => onPick(q)}
                  className="inline-flex h-10 max-w-full items-center gap-2 rounded-full bg-surface-2 px-3.5 text-sm font-medium text-fg ring-1 ring-line/60 transition hover:bg-primary-soft hover:text-primary-text dark:ring-line"
                >
                  <RotateCcwClock size={15} aria-hidden className="shrink-0 text-subtle" />
                  <span className="truncate">{q}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card>
        <EmptyState icon={Search} title={t("search.prompt")} hint={t("search.startHint")} />
      </Card>
    </div>
  );
}

/* ---------------- Results ---------------- */

function Results({
  search,
  query,
  tab,
  onTab,
  onPick,
}: {
  search: SearchState;
  query: string;
  tab: Tab;
  onTab: (tab: Tab) => void;
  onPick: () => void;
}) {
  const t = useT();
  const { data } = search;
  const count = resultCount(data);

  if (search.error) {
    return (
      <QueryState loading={false} error={search.error} onRetry={search.retry}>
        {null}
      </QueryState>
    );
  }
  if (!data || (search.loading && count === 0)) {
    return (
      <QueryState loading error={null} skeleton={<ResultsSkeleton />}>
        {null}
      </QueryState>
    );
  }
  if (count === 0) {
    return (
      <Card>
        <EmptyState icon={SearchX} title={t("search.noResults")} hint={t("search.emptyHint")} />
      </Card>
    );
  }

  const groups: { key: Group; label: string; count: number }[] = [
    { key: "courses", label: t("search.courses"), count: data.courses.length },
    { key: "people", label: t("search.people"), count: data.people.length },
    { key: "notifications", label: t("search.notifications"), count: data.notifications.length },
    ...(data.content ? [{ key: "content" as const, label: t("search.content"), count: data.content.length }] : []),
  ];
  const current: Tab = groups.some((g) => g.key === tab) ? tab : "all";
  const visible = groups.filter((g) => g.count > 0 && (current === "all" || g.key === current));
  // People come from Moodle's accent-sensitive name search (see /api/search).
  const peopleTip = data.people.length === 0 && !hasAccents(query) ? t("search.peopleHint") : null;

  return (
    <div className="space-y-6">
      <Tabs<Tab>
        id="search"
        aria-label={t("search.filterBy")}
        value={current}
        onChange={onTab}
        items={[{ key: "all", label: t("search.all"), count }, ...groups.map(({ key, label, count }) => ({ key, label, count }))]}
      />
      <div
        {...tabPanelProps("search", current)}
        aria-busy={search.loading}
        className={cn("space-y-8 rounded-card transition-opacity", search.stale && "opacity-60")}
      >
        {visible.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon={SearchX}
              title={t("search.noResults")}
              hint={current === "people" ? peopleTip : undefined}
            />
          </Card>
        ) : (
          visible.map((g) => (
            <section key={g.key} className="animate-fade-in-up">
              {current === "all" ? (
                <SectionTitle
                  title={
                    <span className="flex items-center gap-2">
                      {g.label}
                      <Badge tone="neutral">{g.count}</Badge>
                    </span>
                  }
                />
              ) : (
                <h2 className="sr-only">{g.label}</h2>
              )}
              <GroupResults group={g.key} data={data} onPick={onPick} />
              {g.count >= data.limit && <p className="mt-3 text-xs text-subtle">{t("search.capped", { n: data.limit })}</p>}
            </section>
          ))
        )}
        {current === "all" && peopleTip && (
          <p className="flex items-start gap-2 text-xs text-subtle">
            <Info size={14} aria-hidden className="mt-px shrink-0" />
            {peopleTip}
          </p>
        )}
      </div>
    </div>
  );
}

function GroupResults({ group, data, onPick }: { group: Group; data: SearchPayload; onPick: () => void }) {
  switch (group) {
    case "courses":
      return (
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {data.courses.map((hit) => (
            <li key={hit.id}>
              <CourseResult hit={hit} onPick={onPick} />
            </li>
          ))}
        </ul>
      );
    case "people":
      return (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.people.map((hit) => (
            <li key={hit.id}>
              <PersonResult hit={hit} onPick={onPick} />
            </li>
          ))}
        </ul>
      );
    case "notifications":
      return (
        <ResultList>
          {data.notifications.map((hit) => (
            <li key={hit.id}>
              <NotificationResult hit={hit} onPick={onPick} />
            </li>
          ))}
        </ResultList>
      );
    case "content":
      return (
        <ResultList>
          {(data.content ?? []).map((hit) => (
            <li key={hit.key}>
              <ContentResult hit={hit} onPick={onPick} />
            </li>
          ))}
        </ResultList>
      );
  }
}

const cardLinkClass =
  "group block h-full rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Cover card from sm up; a compact row with a thumbnail on phones. */
function CourseResult({ hit, onPick }: { hit: CourseHit; onPick: () => void }) {
  const t = useT();
  return (
    <Link href={`/courses/${hit.id}`} onClick={onPick} style={courseStyle(hit.id)} className={cardLinkClass}>
      <Card className="flex h-full items-center gap-3 overflow-hidden p-3 transition duration-200 group-hover:shadow-course motion-safe:group-hover:-translate-y-0.5 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0">
        <CourseMark course={hit} size="md" className="sm:hidden" />
        <CourseCover course={hit} className="hidden sm:block" />
        <div className="min-w-0 flex-1 sm:p-4">
          <p className="truncate text-xs font-bold text-course">
            <Highlight text={hit.shortname} ranges={hit.hl.shortname} />
            {hit.category && ` · ${hit.category}`}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-fg sm:text-[15px]">
            <Highlight text={hit.fullname} ranges={hit.hl.fullname} />
          </h3>
          {hit.progress !== null && (
            <div className="mt-2.5 flex items-center gap-2">
              <Progress value={hit.progress} tone="course" size="sm" label={t("courses.progress")} />
              <span className="shrink-0 text-xs font-bold tabular-nums text-course">{hit.progress}%</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

function PersonResult({ hit, onPick }: { hit: PersonHit; onPick: () => void }) {
  const t = useT();
  return (
    <Link href={`/messages/${hit.id}`} onClick={onPick} className={cardLinkClass}>
      <Card className="flex h-full items-center gap-3 p-3.5 transition duration-200 group-hover:shadow-lift motion-safe:group-hover:-translate-y-0.5">
        <UserAvatar name={hit.fullname} id={hit.id} src={hit.profileimageurl} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-fg">
            <Highlight text={hit.fullname} ranges={hit.hl.fullname} />
          </p>
          <p className="truncate text-xs text-subtle">{t("search.sendMessage")}</p>
        </div>
        {hit.contact && <Badge tone="accent">{t("search.contact")}</Badge>}
        <IconTile icon={MessageCircle} tone="accent" size="sm" />
      </Card>
    </Link>
  );
}

function ResultList({ children }: { children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-line/70">{children}</ul>
    </Card>
  );
}

function ResultRow({
  href,
  look,
  onPick,
  children,
}: {
  href: string;
  look: Look;
  onPick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onPick}
      className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 focus-visible:-outline-offset-2 sm:px-5"
    >
      <IconTile icon={look.icon} tone={look.tone} size="sm" />
      <div className="min-w-0 flex-1">{children}</div>
      <ChevronRight size={16} aria-hidden className="mt-2.5 shrink-0 text-subtle transition-colors group-hover:text-fg" />
    </Link>
  );
}

function When({ unix }: { unix: number }) {
  const { locale } = useLocale();
  return <time dateTime={new Date(unix * 1000).toISOString()}>{timeAgo(unix, locale)}</time>;
}

function NotificationResult({ hit, onPick }: { hit: NotificationHit; onPick: () => void }) {
  return (
    <ResultRow href={`/notifications/${hit.id}`} look={notificationMeta(hit)} onPick={onPick}>
      <p className="flex items-center gap-2">
        <span className={cn("truncate text-sm text-fg", hit.read ? "font-medium" : "font-bold")}>
          <Highlight text={hit.subject} ranges={hit.hl.subject} />
        </span>
        {!hit.read && <UnreadDot />}
      </p>
      {hit.snippet && (
        <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">
          <Highlight text={hit.snippet} ranges={hit.hl.snippet} />
        </p>
      )}
      <p className="mt-1 text-xs text-subtle">
        <When unix={hit.timecreated} />
      </p>
    </ResultRow>
  );
}

function ContentResult({ hit, onPick }: { hit: ContentHit; onPick: () => void }) {
  const t = useT();
  const kind = hit.component.startsWith("mod_") ? t(moduleMeta(hit.component.slice(4)).labelKey) : "";
  const meta = [kind, hit.course].filter(Boolean).join(" · ");
  return (
    <ResultRow href={hit.href} look={contentLook(hit.component)} onPick={onPick}>
      <p className="truncate text-sm font-bold text-fg">
        <Highlight text={hit.title} ranges={hit.hl.title} />
      </p>
      {hit.snippet && (
        <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">
          <Highlight text={hit.snippet} ranges={hit.hl.snippet} />
        </p>
      )}
      <p className="mt-1 truncate text-xs text-subtle">
        {meta && `${meta} · `}
        <When unix={hit.timemodified} />
      </p>
    </ResultRow>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-card sm:h-56" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-card" />
    </div>
  );
}
