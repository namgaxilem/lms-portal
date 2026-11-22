"use client";
import { useId, useMemo, useState, type ReactNode } from "react";
import { Pagination, Select } from "antd";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, Users } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useT } from "@/i18n/I18nProvider";
import { Button, Card, EmptyState, Input, Tabs, cn, tabPanelProps } from "@/components/ui";
import type { GradeRow } from "@/components/grades/lib";
import type { EnrolledUser } from "@/lib/moodle/types";
import { foldSearch } from "@/lib/format";
import { LastAccessCell, PersonCell, ProgressCell, RoleBadges, TotalCell } from "./ParticipantCells";
import type { LearnerCompletion } from "./types";

const PAGE_SIZE = 20;
const TABS_ID = "participants";

type Filter = "all" | "students" | "staff";
type SortKey = "name" | "progress" | "grade" | "lastaccess";
type Dir = 1 | -1;
interface Sort {
  key: SortKey;
  dir: Dir;
}

interface Row {
  user: EnrolledUser;
  /** Position in Moodle's name order. */
  order: number;
  name: string;
  self: boolean;
  learner: boolean;
  /** undefined = still loading. */
  progress: LearnerCompletion | undefined;
  total: GradeRow | null;
  search: string;
}

/** Nulls always sort last, whatever the direction. */
function compareNullable(a: number | null | undefined, b: number | null | undefined, dir: Dir) {
  const x = a ?? null;
  const y = b ?? null;
  if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
  return (x - y) * dir;
}

const percentOf = (r: Row) => (r.progress?.status === "tracked" ? r.progress.progress.percent : null);

const SORTERS: Record<SortKey, (a: Row, b: Row, dir: Dir) => number> = {
  name: (a, b, dir) => (a.order - b.order) * dir,
  progress: (a, b, dir) => compareNullable(percentOf(a), percentOf(b), dir),
  grade: (a, b, dir) => compareNullable(a.total?.raw, b.total?.raw, dir),
  lastaccess: (a, b, dir) => compareNullable(a.user.lastcourseaccess, b.user.lastcourseaccess, dir),
};

/** Names A→Z first; numbers highest first. */
const DEFAULT_DIR: Record<SortKey, Dir> = { name: 1, progress: -1, grade: -1, lastaccess: -1 };

/** Staff rows: completion is not tracked for them. */
const UNTRACKED: LearnerCompletion = { status: "untracked-user" };

/** Desktop column templates, by [progress shown][total shown] (literal for Tailwind). */
const GRID = {
  both: "md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(9rem,1fr)_6.5rem_8.5rem]",
  progress: "md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(9rem,1fr)_8.5rem]",
  total: "md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_6.5rem_8.5rem]",
  none: "md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_8.5rem]",
};

/**
 * Sortable column header. On phones the header row is only for screen readers,
 * so it holds plain text there (no invisible focus stops); the button is md+.
 */
function SortHeader({ label, sortKey, sort, onSort }: { label: string; sortKey: SortKey; sort: Sort; onSort: (key: SortKey) => void }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  return (
    <div role="columnheader" aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <span className="md:hidden">{label}</span>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "-mx-1.5 hidden items-center gap-1 rounded-lg px-1.5 py-0.5 transition hover:bg-surface-3 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring md:inline-flex",
          active && "text-fg"
        )}
      >
        {label}
        <Icon size={13} aria-hidden />
      </button>
    </div>
  );
}

function Cell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div role="cell" className={cn("min-w-0", className)}>
      {children}
    </div>
  );
}

/**
 * Participants of a course as an ARIA table: a grid on desktop that reflows
 * into cards on phones. Search (accent-insensitive), role filter, sorting and
 * pagination are client-side — Moodle returns the whole list in one call.
 */
export function ParticipantsTable({
  participants,
  learners,
  progress,
  totals,
}: {
  participants: EnrolledUser[];
  learners: Set<number>;
  /** null when progress is not loaded for this class (column hidden). */
  progress: Map<number, LearnerCompletion> | null;
  /** null hides the course total column. */
  totals: Map<number, GradeRow> | null;
}) {
  const t = useT();
  const { user } = useSession();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "name", dir: 1 });
  const [page, setPage] = useState(1);
  const sortLabelId = useId();

  const rows = useMemo<Row[]>(
    () =>
      participants.map((u, order) => {
        const self = u.id === user.id;
        // The signed-in user's own row uses the session name, like the shell
        // (Moodle may return its alternative full-name format here).
        const name = self ? user.fullname : u.fullname;
        const learner = learners.has(u.id);
        return {
          user: u,
          order,
          name,
          self,
          learner,
          progress: learner && progress ? progress.get(u.id) : UNTRACKED,
          total: learner && totals ? (totals.get(u.id) ?? null) : null,
          search: foldSearch(`${name} ${u.email ?? ""}`),
        };
      }),
    [participants, learners, progress, totals, user.id, user.fullname]
  );

  const visible = useMemo(() => {
    const q = foldSearch(query);
    const sorter = SORTERS[sort.key];
    return rows
      .filter((r) => (filter === "all" || (filter === "students") === r.learner) && (!q || r.search.includes(q)))
      .sort((a, b) => sorter(a, b, sort.dir) || a.order - b.order);
  }, [rows, filter, query, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageRows = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const showProgress = progress !== null;
  const showTotal = totals !== null;
  const grid = GRID[showProgress && showTotal ? "both" : showProgress ? "progress" : showTotal ? "total" : "none"];

  const changeSort = (next: Sort) => {
    setSort(next);
    setPage(1);
  };
  const ascending = sort.dir === 1;
  const directionLabel = ascending ? t("reports.sortAscending") : t("reports.sortDescending");
  const onHeaderSort = (key: SortKey) =>
    changeSort(sort.key === key ? { key, dir: sort.dir === 1 ? -1 : 1 } : { key, dir: DEFAULT_DIR[key] });

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "name", label: t("reports.name") },
    ...(showProgress ? [{ value: "progress" as const, label: t("reports.progress") }] : []),
    ...(showTotal ? [{ value: "grade" as const, label: t("grades.courseTotal") }] : []),
    { value: "lastaccess", label: t("reports.lastAccess") },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 px-4 pb-4 pt-5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-base font-bold text-fg">{t("reports.participants")}</h2>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          {/* No counts in the tabs: the stat cards above show the same three numbers. */}
          <Tabs<Filter>
            id={TABS_ID}
            aria-label={t("reports.filterLabel")}
            value={filter}
            onChange={(f) => {
              setFilter(f);
              setPage(1);
            }}
            items={[
              { key: "all", label: t("reports.filterAll") },
              { key: "students", label: t("reports.students") },
              { key: "staff", label: t("reports.staff") },
            ]}
          />
          <Input
            icon={Search}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={t("reports.searchParticipants")}
            aria-label={t("reports.searchParticipants")}
            wrapperClassName="sm:w-64 sm:shrink-0"
          />
        </div>
      </div>

      <div {...tabPanelProps(TABS_ID, filter)}>
        {visible.length === 0 ? (
          <EmptyState icon={Users} compact title={query.trim() ? t("reports.noMatches") : t("reports.noUsers")} />
        ) : (
          <>
            <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-2.5 md:hidden">
              <span id={sortLabelId} className="text-xs font-semibold text-subtle">
                {t("reports.sortBy")}
              </span>
              <Select<SortKey>
                className="min-w-36"
                value={sort.key}
                onChange={(key) => changeSort({ key, dir: DEFAULT_DIR[key] })}
                options={sortOptions}
                aria-labelledby={sortLabelId}
              />
              <Button
                variant="secondary"
                size="icon"
                onClick={() => changeSort({ key: sort.key, dir: ascending ? -1 : 1 })}
                aria-label={directionLabel}
                title={directionLabel}
              >
                {ascending ? <ArrowUp size={16} aria-hidden /> : <ArrowDown size={16} aria-hidden />}
              </Button>
            </div>
            <div role="table" aria-label={t("reports.participants")}>
              {/* Visible from md; on phones the column names stay available to screen readers. */}
              <div role="rowgroup" className="sr-only md:not-sr-only">
                <div role="row" className={cn("grid gap-4 border-y border-line bg-surface-2/60 px-5 py-2.5 text-xs font-bold text-subtle", grid)}>
                  <SortHeader label={t("reports.name")} sortKey="name" sort={sort} onSort={onHeaderSort} />
                  <div role="columnheader">{t("reports.roles")}</div>
                  {showProgress && <SortHeader label={t("reports.progress")} sortKey="progress" sort={sort} onSort={onHeaderSort} />}
                  {showTotal && <SortHeader label={t("grades.courseTotal")} sortKey="grade" sort={sort} onSort={onHeaderSort} />}
                  <SortHeader label={t("reports.lastAccess")} sortKey="lastaccess" sort={sort} onSort={onHeaderSort} />
                </div>
              </div>
              <div role="rowgroup" className="divide-y divide-line border-t border-line md:border-t-0">
                {pageRows.map((r) => (
                  <div
                    key={r.user.id}
                    role="row"
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-surface-2/50 sm:px-5",
                      grid,
                      r.self && "bg-primary-soft/50"
                    )}
                  >
                    <Cell className="order-1 md:order-none">
                      <PersonCell user={r.user} name={r.name} self={r.self} />
                    </Cell>
                    <Cell className="order-3 col-span-2 md:order-none md:col-span-1">
                      <RoleBadges user={r.user} />
                    </Cell>
                    {showProgress && (
                      <Cell className={cn("order-4 md:order-none md:col-span-1", !showTotal && "col-span-2")}>
                        <ProgressCell completion={r.progress} />
                      </Cell>
                    )}
                    {showTotal && (
                      <Cell className={cn("order-5 md:order-none", showProgress ? "justify-self-end md:justify-self-start" : "col-span-2 md:col-span-1")}>
                        <TotalCell total={r.total} />
                      </Cell>
                    )}
                    <Cell className="order-2 justify-self-end text-right md:order-none md:justify-self-start md:text-left">
                      <LastAccessCell value={r.user.lastcourseaccess} />
                    </Cell>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {visible.length > PAGE_SIZE && (
        <div className="flex justify-center border-t border-line px-4 py-3">
          <Pagination current={current} pageSize={PAGE_SIZE} total={visible.length} onChange={setPage} showSizeChanger={false} />
        </div>
      )}
    </Card>
  );
}
