"use client";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpLeft,
  CircleAlert,
  CornerDownLeft,
  LoaderCircle,
  RotateCcwClock,
  Search,
  SearchX,
  Trash,
  X,
} from "lucide-react";
import { CourseMark } from "@/components/courses/CourseMark";
import { NAV_CHIP, type NavItem } from "@/components/layout/nav";
import { notificationMeta } from "@/components/notifications/notification-meta";
import { Highlight, SearchStatus, UnreadDot } from "@/components/search/SearchParts";
import { UserAvatar } from "@/components/UserAvatar";
import { useSession } from "@/components/providers/SessionProvider";
import { Badge, Button, EmptyState, IconTile, Skeleton, cn } from "@/components/ui";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { courseStyle } from "@/lib/course-color";
import { timeAgo } from "@/lib/format";
import {
  isSearchable,
  resultCount,
  useRecentSearches,
  useSearch,
  type CourseHit,
  type NotificationHit,
  type PersonHit,
  type SearchPayload,
  type SearchState,
} from "@/lib/search-client";

/* ---------------- Top-bar trigger ---------------- */

const noSubscribe = () => () => {};

/** ⌘ on Apple devices, Ctrl elsewhere (Ctrl during SSR). */
function useIsMac() {
  return useSyncExternalStore(
    noSubscribe,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent),
    () => false
  );
}

/**
 * Top-bar search: a search-field look-alike that opens the command palette
 * (also Ctrl/⌘ K from anywhere). The palette searches courses, people and
 * notifications as you type and links to the full /search page. Before
 * typing it lists `pages`: the shell's navigation for this user.
 */
export function GlobalSearch({ pages }: { pages: readonly NavItem[] }) {
  const t = useT();
  const isMac = useIsMac();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      // Chrome autofill fires keydown events without a key.
      if (typeof e.key !== "string" || e.key.toLowerCase() !== "k") return;
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      e.preventDefault();
      setOpen((o) => !o);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
        className="flex h-11 w-full items-center gap-2.5 rounded-2xl bg-surface px-3 text-left text-sm text-subtle shadow-card ring-1 ring-line/60 transition hover:text-muted hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-4 dark:ring-line brand-bar:bg-white/12 brand-bar:text-white/85 brand-bar:shadow-none brand-bar:ring-white/15 brand-bar:hover:text-white brand-bar:hover:ring-white/30 brand-bar:focus-visible:outline-white"
      >
        <Search size={18} strokeWidth={1.85} aria-hidden className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t("search.placeholder")}</span>
        <kbd
          aria-hidden
          className="hidden shrink-0 whitespace-nowrap rounded-md bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted md:inline-block brand-bar:bg-white/15 brand-bar:text-white/85"
        >
          {isMac ? "⌘ K" : "Ctrl K"}
        </kbd>
      </button>
      {open && createPortal(<SearchPalette pages={pages} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

/* ---------------- Palette model ---------------- */

type Option =
  | { kind: "course"; id: string; href: string; hit: CourseHit }
  | { kind: "person"; id: string; href: string; hit: PersonHit }
  | { kind: "notification"; id: string; href: string; hit: NotificationHit }
  | { kind: "page"; id: string; href: string; page: NavItem }
  | { kind: "all"; id: string; href: string; query: string }
  | { kind: "recent"; id: string; query: string }
  | { kind: "clear"; id: string };

type LinkOption = Extract<Option, { href: string }>;

interface Section {
  key: string;
  label?: string;
  options: Option[];
}

type T = ReturnType<typeof useT>;

/** Before typing: recent searches and quick links. While searching: grouped hits, then "see all". */
function buildSections(
  prefix: string,
  query: string,
  data: SearchPayload | null,
  recent: string[],
  pages: readonly NavItem[],
  t: T
): Section[] {
  const q = query.trim();
  if (!isSearchable(q)) {
    const sections: Section[] = [];
    if (recent.length) {
      sections.push({
        key: "recent",
        label: t("search.recent"),
        options: [
          ...recent.map((r, i): Option => ({ kind: "recent", id: `${prefix}-r${i}`, query: r })),
          { kind: "clear", id: `${prefix}-clear` },
        ],
      });
    }
    sections.push({
      key: "pages",
      label: t("search.jumpTo"),
      options: pages.map((page, i) => ({ kind: "page", id: `${prefix}-p${i}`, href: page.href, page })),
    });
    return sections;
  }

  const sections: Section[] = [];
  if (data?.courses.length) {
    sections.push({
      key: "courses",
      label: t("search.courses"),
      options: data.courses.map((hit) => ({ kind: "course", id: `${prefix}-c${hit.id}`, href: `/courses/${hit.id}`, hit })),
    });
  }
  if (data?.people.length) {
    sections.push({
      key: "people",
      label: t("search.people"),
      options: data.people.map((hit) => ({ kind: "person", id: `${prefix}-u${hit.id}`, href: `/messages/${hit.id}`, hit })),
    });
  }
  if (data?.notifications.length) {
    sections.push({
      key: "notifications",
      label: t("search.notifications"),
      options: data.notifications.map((hit) => ({
        kind: "notification",
        id: `${prefix}-n${hit.id}`,
        href: `/notifications/${hit.id}`,
        hit,
      })),
    });
  }
  sections.push({
    key: "all",
    options: [{ kind: "all", id: `${prefix}-all`, href: `/search?q=${encodeURIComponent(q)}`, query: q }],
  });
  return sections;
}

/* ---------------- Palette ---------------- */

/**
 * Command palette in a modal <dialog> (focus stays inside, Esc and the
 * backdrop close it). WAI-ARIA combobox: focus stays in the input while
 * ↑/↓ move the active option and Enter opens it.
 */
function SearchPalette({ pages, onClose }: { pages: readonly NavItem[]; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const { user } = useSession();
  const recent = useRecentSearches(user.id);
  const [query, setQuery] = useState("");
  const search = useSearch(query);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    inputRef.current?.focus();
    // close() returns focus to whatever was focused before the palette opened.
    return () => dialog.close();
  }, []);

  const searching = isSearchable(query);
  const sections = buildSections(baseId, query, search.data, recent.items, pages, t);
  const options = sections.flatMap((s) => s.options);

  // The active option resets whenever the list changes: to the first one, or to
  // none while the rows still show the previous query's hits (dimmed), so that
  // Enter right after typing searches the typed text instead of opening an old hit.
  const listKey = `${query.trim()}|${search.data?.query ?? ""}|${options.length}`;
  const [cursor, setCursor] = useState({ key: listKey, index: 0 });
  const activeIndex = cursor.key === listKey ? Math.min(cursor.index, options.length - 1) : search.stale ? -1 : 0;
  const active: Option | undefined = options[activeIndex];
  const activeId = active?.id;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function rememberQuery() {
    if (searching) recent.add(query);
  }

  function choose(option: Option) {
    if (option.kind === "recent") {
      setQuery(option.query);
    } else if (option.kind === "clear") {
      recent.clear();
    } else {
      rememberQuery();
      onClose();
      router.push(option.href);
    }
  }

  function onLinkClick(e: MouseEvent<HTMLAnchorElement>) {
    // Modified clicks open a new tab or window: keep the palette open.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    rememberQuery();
    onClose();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!options.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      // From "nothing active", ↓ goes to the first option and ↑ to the last.
      const from = activeIndex < 0 ? (step > 0 ? -1 : 0) : activeIndex;
      setCursor({ key: listKey, index: (from + step + options.length) % options.length });
    } else if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      const target = active ?? options.find((o) => o.kind === "all");
      if (!target) return;
      e.preventDefault();
      choose(target);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={t("search.title")}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={(e) => {
        // The browser may force-close the dialog (e.g. repeated Esc); ignore the
        // close events of our own cleanup (detached or already reopened dialog).
        if (!e.currentTarget.open && e.currentTarget.isConnected) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // Backdrop click.
      }}
      className="fixed inset-x-0 top-0 m-0 mx-auto mt-[8dvh] h-fit max-h-[84dvh] w-[calc(100%-2rem)] max-w-2xl animate-fade-in-up overflow-hidden rounded-hero bg-surface p-0 text-fg shadow-pop ring-1 ring-line/60 backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm dark:ring-line"
    >
      <div className="flex max-h-[84dvh] flex-col">
        <div className="flex items-center gap-3 border-b border-line/70 px-4 sm:px-5">
          <IconTile icon={Search} tone="primary" solid size="sm" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            aria-label={t("search.title")}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("search.placeholder")}
            className="h-16 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-subtle"
          />
          {search.loading && <LoaderCircle size={18} aria-hidden className="shrink-0 animate-spin text-subtle" />}
          {/* The name contains the visible "Esc" (WCAG 2.5.3); 40px hit area with a small key-cap look. */}
          <button
            type="button"
            onClick={onClose}
            aria-label={`${t("common.close")} (Esc)`}
            className="group -mr-1.5 grid h-10 min-w-10 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring sm:hover:bg-transparent"
          >
            <X size={18} aria-hidden className="sm:hidden" />
            <span
              aria-hidden
              className="hidden rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-semibold ring-1 ring-line/60 transition group-hover:ring-line-strong sm:inline dark:ring-line"
            >
              Esc
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {searching && <PaletteStatus search={search} />}
          <div id={listId} role="listbox" aria-label={t("search.title")}>
            {sections.map((section) => (
              <OptionGroup
                key={section.key}
                section={section}
                labelId={`${baseId}-g-${section.key}`}
                dimmed={search.stale && section.key !== "all"}
              >
                {section.options.map((option) => (
                  <OptionRow
                    key={option.id}
                    option={option}
                    active={option.id === activeId}
                    onHover={() => setCursor({ key: listKey, index: options.indexOf(option) })}
                    onChoose={choose}
                    onLinkClick={onLinkClick}
                  />
                ))}
              </OptionGroup>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-5 border-t border-line/70 bg-surface-2/60 px-5 py-2.5 text-xs text-subtle sm:flex">
          <KeyHint keys={["↑", "↓"]} label={t("search.hintNavigate")} />
          <KeyHint keys={["↵"]} label={t("search.hintOpen")} />
          <KeyHint keys={["Esc"]} label={t("search.hintClose")} />
        </div>
        <SearchStatus search={search} searching={searching} />
      </div>
    </dialog>
  );
}

/** Loading, error and empty states above the "see all" option. */
function PaletteStatus({ search }: { search: SearchState }) {
  const t = useT();
  const count = resultCount(search.data);
  if (search.error) {
    return (
      <div className="m-2 flex items-start gap-3 rounded-2xl bg-error-soft p-3.5 text-error-text">
        <CircleAlert size={18} aria-hidden className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t("common.errorTitle")}</p>
          <p className="mt-0.5 truncate text-[13px] opacity-80">{search.error}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={search.retry}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }
  if (!search.data || (search.loading && count === 0)) {
    return (
      <div aria-hidden className="space-y-1 p-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (count === 0) {
    return <EmptyState compact icon={SearchX} title={t("search.noResults")} hint={t("search.emptyHint")} />;
  }
  return null;
}

function OptionGroup({
  section,
  labelId,
  dimmed,
  children,
}: {
  section: Section;
  labelId: string;
  /** The previous query's hits, shown while the new one loads. */
  dimmed: boolean;
  children: ReactNode;
}) {
  if (!section.label) return <div className="mt-1 border-t border-line/70 pt-1">{children}</div>;
  return (
    <div role="group" aria-labelledby={labelId} className={cn("pb-1 transition-opacity", dimmed && "opacity-60")}>
      <p id={labelId} className="px-3 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wider text-subtle">
        {section.label}
      </p>
      {children}
    </div>
  );
}

function OptionRow({
  option,
  active,
  onHover,
  onChoose,
  onLinkClick,
}: {
  option: Option;
  active: boolean;
  onHover: () => void;
  onChoose: (option: Option) => void;
  onLinkClick: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const t = useT();
  const props = {
    id: option.id,
    role: "option" as const,
    "aria-selected": active,
    onMouseMove: active ? undefined : onHover,
    // Keep focus (and the caret) in the input.
    onMouseDown: (e: MouseEvent) => e.preventDefault(),
    className: cn(
      "flex w-full items-center gap-3 rounded-2xl px-3 text-left transition-colors",
      option.kind === "clear" ? "py-1.5" : "py-2",
      active && "bg-primary-soft"
    ),
  };
  if ("href" in option) {
    return (
      <Link href={option.href} tabIndex={-1} onClick={onLinkClick} {...props}>
        <LinkOptionBody option={option} />
        {active && <CornerDownLeft size={16} aria-hidden className="hidden shrink-0 text-primary-text sm:block" />}
      </Link>
    );
  }
  return (
    <div {...props} onClick={() => onChoose(option)}>
      {option.kind === "recent" ? (
        <>
          <IconTile icon={RotateCcwClock} tone="neutral" size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{option.query}</span>
          <ArrowUpLeft size={16} aria-hidden className="shrink-0 text-subtle" />
        </>
      ) : (
        <span className="flex items-center gap-2 pl-1 text-xs font-semibold text-subtle">
          <Trash size={14} aria-hidden />
          {t("search.clearRecent")}
        </span>
      )}
    </div>
  );
}

function LinkOptionBody({ option }: { option: LinkOption }) {
  const t = useT();
  const { locale } = useLocale();
  switch (option.kind) {
    case "course": {
      const { hit } = option;
      return (
        <>
          <CourseMark course={hit} size="xs" />
          <OptionText
            title={<Highlight text={hit.fullname} ranges={hit.hl.fullname} />}
            subtitle={
              <>
                <Highlight text={hit.shortname} ranges={hit.hl.shortname} />
                {hit.category && ` · ${hit.category}`}
              </>
            }
          />
          {hit.progress !== null && (
            <span className="shrink-0 text-xs font-bold tabular-nums text-course" style={courseStyle(hit.id)}>
              <span aria-hidden>{hit.progress}%</span>
              <span className="sr-only">{t("search.progress", { n: hit.progress })}</span>
            </span>
          )}
        </>
      );
    }
    case "person": {
      const { hit } = option;
      return (
        <>
          <UserAvatar name={hit.fullname} id={hit.id} src={hit.profileimageurl} size={40} />
          <OptionText title={<Highlight text={hit.fullname} ranges={hit.hl.fullname} />} subtitle={t("search.sendMessage")} />
          {hit.contact && <Badge tone="accent">{t("search.contact")}</Badge>}
        </>
      );
    }
    case "notification": {
      const { hit } = option;
      const look = notificationMeta(hit);
      return (
        <>
          <IconTile icon={look.icon} tone={look.tone} size="sm" />
          <OptionText
            strong={!hit.read}
            title={<Highlight text={hit.subject} ranges={hit.hl.subject} />}
            subtitle={hit.snippet && <Highlight text={hit.snippet} ranges={hit.hl.snippet} />}
          />
          <span className="flex shrink-0 items-center gap-2 text-xs text-subtle">
            {timeAgo(hit.timecreated, locale)}
            {!hit.read && <UnreadDot />}
          </span>
        </>
      );
    }
    case "page": {
      const { icon: Icon, color, labelKey } = option.page;
      return (
        <>
          <span aria-hidden className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", NAV_CHIP[color].soft)}>
            <Icon size={17} strokeWidth={1.85} />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{t(labelKey)}</span>
        </>
      );
    }
    case "all":
      return (
        <>
          <IconTile icon={ArrowRight} tone="primary" size="sm" />
          <OptionText title={t("search.viewAll")} subtitle={t("search.resultsFor", { q: option.query })} />
        </>
      );
  }
}

function OptionText({ title, subtitle, strong = true }: { title: ReactNode; subtitle?: ReactNode; strong?: boolean }) {
  return (
    <span className="min-w-0 flex-1">
      <span className={cn("block truncate text-sm text-fg", strong ? "font-semibold" : "font-medium")}>{title}</span>
      {subtitle && <span className="block truncate text-xs text-subtle">{subtitle}</span>}
    </span>
  );
}

function KeyHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {keys.map((k) => (
        <kbd
          key={k}
          className="grid h-5 min-w-5 place-items-center rounded-md bg-surface px-1 font-sans text-[11px] font-semibold text-muted ring-1 ring-line"
        >
          {k}
        </kbd>
      ))}
      {label}
    </span>
  );
}
