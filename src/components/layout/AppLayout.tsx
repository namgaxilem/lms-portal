"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Drawer, Dropdown, type MenuProps } from "antd";
import { ChevronsUpDown, Flame, LayoutGrid, LogOut, Moon, Play, Sun, User } from "lucide-react";
import { useBrand } from "@/components/providers/BrandProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useT } from "@/i18n/I18nProvider";
import { LangSwitcher } from "@/components/LangSwitcher";
import { UserAvatar } from "@/components/UserAvatar";
import { BrandMark } from "@/components/public/brand-ui";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { NotificationBell } from "@/components/layout/NotificationBell";
import {
  NAV_CHIP,
  groupNavItems,
  isNavActive,
  visibleNavItems,
  type NavBadge,
  type NavItem,
} from "@/components/layout/nav";
import { useGradableCourses } from "@/components/grading/useGradableCourses";
import { useMediaQuery, useVisibleInterval } from "@/lib/browser-hooks";
import { cn } from "@/components/ui";
import { moodleCached } from "@/lib/client-api";
import { accountRole, isStaffRole } from "@/lib/format";
import { useMyLearningActivity } from "@/lib/moodle/hooks";
import { MESSAGES_CHANGED, NOTIFICATIONS_CHANGED } from "@/lib/notifications";

const MIN = 60_000;

const STUDENT_NAV = visibleNavItems({ staff: false, gradable: false });

/** Focus mode, without app chrome: the SCORM player brings its own header (back, outline, prev/next). */
const isFocusRoute = (pathname: string) => pathname.startsWith("/scorm/");

type Badges = Record<NavBadge, number>;

/**
 * App shell. Desktop: sidebar + top bar. Phones and tablets: top bar + tab bar
 * (with the "continue learning" button in the middle and a "More" sheet for
 * every other page). Focus routes get no chrome at all.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  if (isFocusRoute(pathname)) return <FocusShell pathname={pathname}>{children}</FocusShell>;
  if (isStaffRole(accountRole(user))) return <StaffShell>{children}</StaffShell>;
  return <Shell items={STUDENT_NAV}>{children}</Shell>;
}

/**
 * Staff see "Grading" once Moodle reports an assignment they may grade (the
 * shared, cached mod/assign:grade check), so sites without assignments never
 * show it. It is the last item, so appearing after the check moves nothing.
 */
function StaffShell({ children }: { children: ReactNode }) {
  const { courses } = useGradableCourses();
  const gradable = courses.length > 0;
  const items = useMemo(() => visibleNavItems({ staff: true, gradable }), [gradable]);
  return <Shell items={items}>{children}</Shell>;
}

/* ---------------- Shells ---------------- */

/**
 * Chrome sizes as CSS variables, for the paddings below and for the bell's
 * phone panel: `--topbar-h`, and `--tabbar-h` (0 from lg, where the sidebar
 * replaces the tab bar).
 */
const CHROME_VARS = "[--topbar-h:4rem] [--tabbar-h:calc(4rem+env(safe-area-inset-bottom))] lg:[--tabbar-h:0px]";

function Shell({ items, children }: { items: readonly NavItem[]; children: ReactNode }) {
  const pathname = usePathname();
  const { stats } = useMyLearningActivity();
  const messages = useUnreadCount("core_message_get_unread_conversations_count", MESSAGES_CHANGED);
  const notifications = useUnreadCount("message_popup_get_unread_popup_notification_count", NOTIFICATIONS_CHANGED);
  const badges: Badges = { messages, notifications };
  const accountMenu = useAccountMenu();
  // The sheet remembers the page it was opened on, so any navigation (links, Back) closes it.
  // It also closes from lg (e.g. a tablet rotated to landscape), where the tab bar is gone.
  const [sheetOn, setSheetOn] = useState<string | null>(null);
  const desktop = useMediaQuery("(min-width: 64rem)");
  const sheetOpen = sheetOn === pathname && !desktop;
  const streak = stats ? stats.streak : null;

  return (
    <div className={cn("relative min-h-dvh bg-canvas", CHROME_VARS)}>
      <SkipLink />
      <Backdrop />
      <Sidebar items={items} badges={badges} streak={streak} accountMenu={accountMenu} />
      <TopBar items={items} streak={streak} unreadNotifications={notifications} accountMenu={accountMenu} />

      <main id="main" className="relative min-h-dvh pt-(--topbar-h) lg:pl-[264px]">
        <div
          key={pathname}
          className="relative mx-auto max-w-[1320px] animate-fade-in px-4 pb-[calc(var(--tabbar-h)+3rem)] pt-6 sm:px-6 lg:px-8 lg:pt-8"
        >
          {children}
        </div>
      </main>

      <TabBar items={items} badges={badges} moreOpen={sheetOpen} onMore={() => setSheetOn(pathname)} />
      <MoreSheet open={sheetOpen} onClose={() => setSheetOn(null)} items={items} badges={badges} streak={streak} />
    </div>
  );
}

/**
 * Option A's learn screen: no sidebar, top bar or tab bar, just the page. The
 * SCORM player sizes itself from its offset and this padding (useViewportFill).
 */
function FocusShell({ pathname, children }: { pathname: string; children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-canvas">
      <Backdrop />
      <main
        key={pathname}
        className="relative mx-auto max-w-[1800px] animate-fade-in p-(--gap) pb-[max(var(--gap),env(safe-area-inset-bottom))] [--gap:0.5rem] sm:[--gap:0.75rem] lg:[--gap:1rem]"
      >
        {children}
      </main>
    </div>
  );
}

/** Soft brand-coloured blobs behind everything. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-32 top-32 h-[420px] w-[420px] rounded-full bg-brand-accent/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-amber-300/15 blur-3xl dark:bg-amber-300/5" />
    </div>
  );
}

function SkipLink() {
  const t = useT();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-fg focus:shadow-pop"
    >
      {t("shell.skipToContent")}
    </a>
  );
}

/* ---------------- Data ---------------- */

/**
 * An unread counter (a cheap count web service): read on mount, polled every
 * minute while the tab is visible, and re-read when a page fires
 * `changedEvent`. A failed read keeps the last known count.
 */
function useUnreadCount(wsfunction: string, changedEvent: string) {
  const { user } = useSession();
  const [count, setCount] = useState(0);
  const latest = useRef(0);
  const load = useCallback(
    (refresh: boolean) => {
      const id = ++latest.current;
      moodleCached<number>(wsfunction, { useridto: user.id }, MIN, { refresh }).then(
        (n) => id === latest.current && setCount(n),
        () => {
          /* Keep the last known count until the next poll. */
        }
      );
    },
    [wsfunction, user.id]
  );

  useEffect(() => load(false), [load]);
  useVisibleInterval(() => load(true), MIN);
  useEffect(() => {
    const onChange = () => load(true);
    window.addEventListener(changedEvent, onChange);
    return () => window.removeEventListener(changedEvent, onChange);
  }, [changedEvent, load]);

  return count;
}

function useAccountMenu(): MenuProps {
  const t = useT();
  const router = useRouter();
  const { dark, toggle } = useTheme();

  // A full page load, so nothing read for this user (response caches, page
  // state) survives for whoever signs in next on a shared computer.
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  return {
    items: [
      {
        key: "profile",
        icon: <User size={16} strokeWidth={1.75} />,
        label: t("nav.profile"),
        onClick: () => router.push("/profile"),
      },
      {
        key: "theme",
        icon: dark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />,
        label: dark ? t("common.lightMode") : t("common.darkMode"),
        onClick: toggle,
      },
      { type: "divider" },
      { key: "logout", icon: <LogOut size={16} strokeWidth={1.75} />, label: t("auth.signOut"), danger: true, onClick: logout },
    ],
  };
}

/* ---------------- Shared pieces ---------------- */

/** Unread count pill, read as "n unread" by screen readers. */
function CountBadge({ count, className }: { count: number; className?: string }) {
  const t = useT();
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-rose-600 px-1.5 text-2xs font-bold tabular-nums text-white",
        className
      )}
    >
      <span aria-hidden>{count > 99 ? "99+" : count}</span>
      <span className="sr-only">{t("nav.unread", { count })}</span>
    </span>
  );
}

/**
 * Day streak of completed activities (derived from Moodle completion
 * timestamps). `onBrand`: translucent card for the school-coloured sidebar;
 * otherwise the warm gradient card (phone "More" sheet).
 */
function StreakCard({ streak, onBrand = false }: { streak: number; onBrand?: boolean }) {
  const t = useT();
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 text-white",
        onBrand
          ? "bg-white/12 ring-1 ring-white/10"
          : "bg-linear-to-br from-orange-700 via-rose-600 to-fuchsia-700 shadow-lg shadow-rose-500/25"
      )}
    >
      <span
        aria-hidden
        className={cn("absolute -right-4 -top-4 h-20 w-20 rounded-full", onBrand ? "bg-white/[.06]" : "bg-white/15")}
      />
      <p className="relative flex items-center gap-2">
        <Flame
          size={22}
          strokeWidth={2.2}
          className={cn("origin-bottom animate-flicker", onBrand && "text-orange-300")}
          aria-hidden
        />
        <span className="text-2xl font-extrabold tabular-nums">{streak}</span>
        <span className="text-sm font-semibold">{t("shell.streakDays")}</span>
      </p>
      <p className={cn("relative mt-1 text-[13px] leading-snug", onBrand && "text-sidebar-muted")}>
        {streak > 0 ? t("shell.streakKeep") : t("shell.streakStart")}
      </p>
    </div>
  );
}

const badgeOf = (item: NavItem, badges: Badges) => (item.badge ? badges[item.badge] : 0);

/* ---------------- Desktop sidebar ---------------- */

function Sidebar({
  items,
  badges,
  streak,
  accountMenu,
}: {
  items: readonly NavItem[];
  badges: Badges;
  streak: number | null;
  accountMenu: MenuProps;
}) {
  const t = useT();
  const brand = useBrand();
  const { user } = useSession();
  const pathname = usePathname();

  return (
    // School-coloured: bg-sidebar is the brand primary deepened for white text
    // (brand.ts sidebarColors), so it follows whichever school is configured.
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col overflow-hidden bg-sidebar px-4 py-5 text-white lg:flex">
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/[.06]" />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-12 h-60 w-60 rounded-full border-[28px] border-white/[.04]"
      />

      <Link
        href="/dashboard"
        className="relative mb-5 flex items-center gap-3 rounded-2xl px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <BrandMark src={brand.logoMark} size="lg" />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[15px] font-extrabold text-white">{brand.appName}</span>
          <span className="block truncate text-xs text-sidebar-muted">{brand.shortName}</span>
        </span>
      </Link>

      <nav
        aria-label={t("nav.main")}
        className="relative -mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 [scrollbar-color:rgb(255_255_255/0.25)_transparent]"
      >
        {groupNavItems(items).map((group) => (
          <div key={group.id}>
            <p id={`nav-${group.id}`} className="px-3 pb-1.5 text-2xs font-bold uppercase tracking-wider text-sidebar-label">
              {t(group.labelKey)}
            </p>
            <ul aria-labelledby={`nav-${group.id}`} className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <SidebarLink item={item} active={isNavActive(pathname, item.href)} badge={badgeOf(item, badges)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="relative mt-4 space-y-3">
        {streak !== null && <StreakCard streak={streak} onBrand />}
        <Dropdown menu={accountMenu} trigger={["click"]} placement="topLeft">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl bg-white/10 p-2.5 text-left ring-1 ring-white/15 transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <UserAvatar name={user.fullname} id={user.id} src={user.pictureurl} size={40} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-bold text-white">{user.fullname}</span>
              <span className="block truncate text-xs text-sidebar-muted">{t(`role.${accountRole(user)}`)}</span>
            </span>
            <ChevronsUpDown size={15} aria-hidden className="shrink-0 text-sidebar-muted" />
          </button>
        </Dropdown>
      </div>
    </aside>
  );
}

function SidebarLink({ item, active, badge }: { item: NavItem; active: boolean; badge: number }) {
  const t = useT();
  const Icon = item.icon;
  const chip = NAV_CHIP[item.color];
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-2.5 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        active
          ? "bg-white font-semibold text-sidebar-active shadow-lg shadow-black/20"
          : "font-medium text-white/90 hover:bg-white/10 hover:text-white"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition",
          active ? chip.solid : cn(chip.glass, "group-hover:scale-105")
        )}
      >
        <Icon size={18} strokeWidth={1.85} />
      </span>
      <span className="flex-1 truncate">{t(item.labelKey)}</span>
      <CountBadge count={badge} />
    </Link>
  );
}

/* ---------------- Top bar ---------------- */

function TopBar({
  items,
  streak,
  unreadNotifications,
  accountMenu,
}: {
  items: readonly NavItem[];
  streak: number | null;
  unreadNotifications: number;
  accountMenu: MenuProps;
}) {
  const t = useT();
  const brand = useBrand();
  const { user } = useSession();
  const { dark, toggle } = useTheme();

  return (
    // Below lg there is no sidebar, so the top bar carries the school colour
    // (.brand-bar switches its children to light-on-colour styles).
    <header className="brand-bar fixed inset-x-0 top-0 z-30 flex h-(--topbar-h) items-center gap-2 bg-sidebar px-3 text-white sm:gap-3 sm:px-6 lg:left-[264px] lg:border-b lg:border-white/60 lg:bg-canvas/75 lg:px-8 lg:text-fg lg:backdrop-blur-xl lg:dark:border-line">
      <Link href="/dashboard" className="shrink-0 rounded-xl lg:hidden">
        <BrandMark src={brand.logoMark} size="md" alt={brand.appName} />
      </Link>

      <div className="min-w-0 flex-1 sm:max-w-md">
        <GlobalSearch pages={items} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        {streak !== null && (
          <span
            title={t("shell.streakDays")}
            className="hidden items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1.5 text-sm font-bold tabular-nums text-orange-700 sm:flex dark:bg-orange-500/15 dark:text-orange-300 brand-bar:bg-white/15 brand-bar:text-orange-200"
          >
            <Flame size={16} strokeWidth={2.4} className="origin-bottom animate-flicker" aria-hidden />
            {streak}
            <span className="sr-only">{t("shell.streakDays")}</span>
          </span>
        )}
        <LangSwitcher />
        <button
          type="button"
          aria-label={dark ? t("common.lightMode") : t("common.darkMode")}
          onClick={toggle}
          className="hidden h-10 w-10 place-items-center rounded-xl text-muted transition hover:bg-surface hover:text-fg sm:grid brand-bar:text-white/85 brand-bar:hover:bg-white/10 brand-bar:hover:text-white"
        >
          {dark ? <Sun size={18} strokeWidth={1.85} /> : <Moon size={18} strokeWidth={1.85} />}
        </button>
        <NotificationBell unread={unreadNotifications} />
        <Dropdown menu={accountMenu} trigger={["click"]} placement="bottomRight">
          <button type="button" aria-label={t("nav.account")} className="ml-0.5 shrink-0 rounded-full lg:hidden">
            <UserAvatar name={user.fullname} id={user.id} src={user.pictureurl} size={36} />
          </button>
        </Dropdown>
      </div>
    </header>
  );
}

/* ---------------- Phone & tablet navigation ---------------- */

const tabClass = (active: boolean) =>
  cn(
    "flex h-16 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 text-2xs font-semibold transition-colors",
    active ? "text-primary-text" : "text-subtle hover:text-fg"
  );

/** Tab icon with an unread dot; the count is spoken, not shown. */
function TabIcon({ icon: Icon, active, count }: { icon: NavItem["icon"]; active: boolean; count: number }) {
  const t = useT();
  return (
    <span className="relative">
      <Icon size={22} strokeWidth={active ? 2.2 : 1.85} aria-hidden />
      {count > 0 && (
        <>
          <span aria-hidden className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-surface" />
          <span className="sr-only">{t("nav.unread", { count })}</span>
        </>
      )}
    </span>
  );
}

function TabBar({
  items,
  badges,
  moreOpen,
  onMore,
}: {
  items: readonly NavItem[];
  badges: Badges;
  moreOpen: boolean;
  onMore: () => void;
}) {
  const t = useT();
  const pathname = usePathname();
  const tabs = items.filter((item) => item.tab);
  const rest = items.filter((item) => !item.tab);
  const restUnread = rest.reduce((sum, item) => sum + badgeOf(item, badges), 0);

  const tab = (item: NavItem) => {
    const active = isNavActive(pathname, item.href);
    return (
      <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
        <TabIcon icon={item.icon} active={active} count={badgeOf(item, badges)} />
        <span className="w-full truncate px-1 text-center">{t(item.tabLabelKey ?? item.labelKey)}</span>
      </Link>
    );
  };
  // "More" lights up while its sheet is open or one of its pages is shown.
  const moreActive = moreOpen || rest.some((item) => isNavActive(pathname, item.href));

  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-0 bottom-0 z-40 flex h-(--tabbar-h) items-center border-t border-line/70 bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      {tabs.slice(0, 2).map(tab)}
      <div className="flex flex-1 basis-0 justify-center">
        <Link
          href="/continue"
          aria-label={t("nav.continue")}
          className="-mt-8 grid h-16 w-16 place-items-center rounded-full bg-brand-gradient text-white shadow-xl shadow-primary/40 ring-4 ring-surface"
        >
          <Play size={24} fill="currentColor" strokeWidth={0} aria-hidden />
        </Link>
      </div>
      {tabs.slice(2).map(tab)}
      <button type="button" onClick={onMore} aria-haspopup="dialog" aria-expanded={moreOpen} className={tabClass(moreActive)}>
        <TabIcon icon={LayoutGrid} active={moreActive} count={restUnread} />
        <span className="w-full truncate px-1 text-center">{t("nav.more")}</span>
      </button>
    </nav>
  );
}

/** Bottom sheet with the pages that are not on the tab bar, plus the streak card. */
function MoreSheet({
  open,
  onClose,
  items,
  badges,
  streak,
}: {
  open: boolean;
  onClose: () => void;
  items: readonly NavItem[];
  badges: Badges;
  streak: number | null;
}) {
  const t = useT();
  const pathname = usePathname();
  const groups = groupNavItems(items.filter((item) => !item.tab));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="bottom"
      size="auto"
      title={t("nav.more")}
      closable={{ placement: "end" }}
      rootClassName="lg:hidden"
      classNames={{
        wrapper: "overflow-hidden rounded-t-hero",
        section: "max-h-[85dvh] rounded-t-hero bg-surface",
        body: "pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
      }}
    >
      <nav aria-label={t("nav.more")} className="space-y-5">
        {streak !== null && <StreakCard streak={streak} />}
        {groups.map((group) => (
          <div key={group.id}>
            <p id={`more-${group.id}`} className="pb-2 text-2xs font-bold uppercase tracking-wider text-subtle">
              {t(group.labelKey)}
            </p>
            <ul aria-labelledby={`more-${group.id}`} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {group.items.map((item) => (
                <li key={item.href}>
                  <SheetLink
                    item={item}
                    active={isNavActive(pathname, item.href)}
                    badge={badgeOf(item, badges)}
                    onNavigate={onClose}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </Drawer>
  );
}

function SheetLink({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  badge: number;
  onNavigate: () => void;
}) {
  const t = useT();
  const Icon = item.icon;
  const chip = NAV_CHIP[item.color];
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-full flex-col items-center gap-2 rounded-2xl px-1 py-3 text-center text-xs font-semibold leading-tight transition-colors",
        active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
      )}
    >
      <span className={cn("relative grid h-12 w-12 place-items-center rounded-2xl", active ? chip.solid : chip.soft)}>
        <Icon size={22} strokeWidth={1.85} aria-hidden />
        <CountBadge count={badge} className="absolute -right-1.5 -top-1.5 ring-2 ring-surface" />
      </span>
      <span className="line-clamp-2">{t(item.labelKey)}</span>
    </Link>
  );
}
