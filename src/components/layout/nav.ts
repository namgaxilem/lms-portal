import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  House,
  MessageCircle,
} from "lucide-react";

/**
 * The portal's main pages, read by every navigation surface (sidebar, phone
 * tab bar and its "More" sheet, the search palette's quick links) so they
 * cannot drift apart.
 */

/** Colour identity of a page: fixed categorical colours, independent of the school brand. */
type NavColor = "indigo" | "violet" | "amber" | "emerald" | "fuchsia" | "sky" | "rose" | "orange";

/**
 * Icon chip per colour, as static class strings so Tailwind generates them:
 * `soft` is the tinted chip on light surfaces (search palette, "More" sheet),
 * `glass` the chip on the school-coloured sidebar, `solid` the gradient chip
 * of the current page.
 */
export const NAV_CHIP: Record<NavColor, { soft: string; glass: string; solid: string }> = {
  indigo: {
    soft: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
    glass: "bg-white/12 text-indigo-200",
    solid: "bg-linear-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/30",
  },
  violet: {
    soft: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    glass: "bg-white/12 text-violet-200",
    solid: "bg-linear-to-br from-violet-500 to-violet-600 text-white shadow-md shadow-violet-500/30",
  },
  amber: {
    soft: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    glass: "bg-white/12 text-amber-200",
    solid: "bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30",
  },
  emerald: {
    soft: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    glass: "bg-white/12 text-emerald-200",
    solid: "bg-linear-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/30",
  },
  fuchsia: {
    soft: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
    glass: "bg-white/12 text-fuchsia-200",
    solid: "bg-linear-to-br from-fuchsia-500 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/30",
  },
  sky: {
    soft: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
    glass: "bg-white/12 text-sky-200",
    solid: "bg-linear-to-br from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/30",
  },
  rose: {
    soft: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    glass: "bg-white/12 text-rose-200",
    solid: "bg-linear-to-br from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/30",
  },
  orange: {
    soft: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
    glass: "bg-white/12 text-orange-200",
    solid: "bg-linear-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30",
  },
};

type NavGroup = "learning" | "inbox" | "teaching";

/** Groups in display order, with their headings. */
const NAV_GROUPS: readonly { id: NavGroup; labelKey: string }[] = [
  { id: "learning", labelKey: "nav.learning" },
  { id: "inbox", labelKey: "nav.inbox" },
  { id: "teaching", labelKey: "nav.teaching" },
];

/** Live unread counters a page can show as a badge; the shell supplies the numbers. */
export type NavBadge = "messages" | "notifications";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  labelKey: string;
  /** Shorter label for the phone tab bar, where every slot is about 75px wide. */
  tabLabelKey?: string;
  color: NavColor;
  group: NavGroup;
  /** Pinned to the phone tab bar; every other page lives in its "More" sheet. */
  tab?: true;
  badge?: NavBadge;
  /** Staff accounts only: the /teacher/* layout redirects everyone else. */
  staffOnly?: true;
  /** Only when Moodle reports at least one assignment the user may grade. */
  needsGradable?: true;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", icon: House, labelKey: "nav.dashboard", color: "indigo", group: "learning", tab: true },
  {
    href: "/courses",
    icon: BookOpen,
    labelKey: "nav.courses",
    tabLabelKey: "nav.coursesShort",
    color: "violet",
    group: "learning",
    tab: true,
  },
  { href: "/calendar", icon: CalendarDays, labelKey: "nav.calendar", color: "amber", group: "learning", tab: true },
  { href: "/grades", icon: GraduationCap, labelKey: "nav.grades", color: "emerald", group: "learning" },
  { href: "/reports", icon: BarChart3, labelKey: "nav.reports", color: "fuchsia", group: "learning" },
  { href: "/messages", icon: MessageCircle, labelKey: "nav.messages", color: "sky", group: "inbox", badge: "messages" },
  { href: "/notifications", icon: Bell, labelKey: "nav.notifications", color: "rose", group: "inbox", badge: "notifications" },
  {
    href: "/teacher/grading",
    icon: ClipboardCheck,
    labelKey: "nav.grading",
    color: "orange",
    group: "teaching",
    staffOnly: true,
    needsGradable: true,
  },
];

/** The pages this user can open: `staff` = staff account, `gradable` = has assignments to grade. */
export function visibleNavItems({ staff, gradable }: { staff: boolean; gradable: boolean }): NavItem[] {
  return NAV_ITEMS.filter((item) => (staff || !item.staffOnly) && (gradable || !item.needsGradable));
}

/** `items` under their group headings, in display order; empty groups are left out. */
export function groupNavItems(items: readonly NavItem[]) {
  return NAV_GROUPS.map((group) => ({ ...group, items: items.filter((item) => item.group === group.id) })).filter(
    (group) => group.items.length > 0
  );
}

/** Whether `href` is the current page or one of its sub-pages. */
export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
