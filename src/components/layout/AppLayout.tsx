"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Drawer, Dropdown } from "antd";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Bell,
  ChevronsUpDown,
  ClipboardCheck,
  GraduationCap,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Search,
  Sun,
  User,
} from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useT } from "@/i18n/I18nProvider";
import { LangSwitcher } from "@/components/LangSwitcher";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/components/ui/cn";
import { accountRole, isStaffRole } from "@/lib/format";
import { brand } from "@/config/brand";

interface NavItem {
  href: string;
  icon: LucideIcon;
  labelKey: string;
}

const learningNav: NavItem[] = [
  { href: "/dashboard", icon: Home, labelKey: "nav.dashboard" },
  { href: "/courses", icon: BookOpen, labelKey: "nav.courses" },
  { href: "/grades", icon: GraduationCap, labelKey: "nav.grades" },
  { href: "/reports", icon: BarChart3, labelKey: "nav.reports" },
];

const inboxNav: NavItem[] = [
  { href: "/messages", icon: MessageCircle, labelKey: "nav.messages" },
  { href: "/notifications", icon: Bell, labelKey: "nav.notifications" },
];

// Staff-only. The teacher/ route segment is guarded server-side (teacher/layout.tsx).
const teachingNav: NavItem[] = [
  { href: "/teacher/grading", icon: ClipboardCheck, labelKey: "nav.grading" },
];

const mobileNav: NavItem[] = [
  { href: "/dashboard", icon: Home, labelKey: "nav.dashboard" },
  { href: "/courses", icon: BookOpen, labelKey: "nav.courses" },
  { href: "/grades", icon: GraduationCap, labelKey: "nav.grades" },
  { href: "/messages", icon: MessageCircle, labelKey: "nav.messages" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const { dark, toggle: toggleDark } = useTheme();

  const role = accountRole(user);
  const isStaff = isStaffRole(role);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const groups: { label: string; items: NavItem[] }[] = [
    { label: t("nav.learning"), items: learningNav },
    { label: t("nav.messages"), items: inboxNav },
    ...(isStaff ? [{ label: t("nav.teaching"), items: teachingNav }] : []),
  ];

  const accountMenu = {
    items: [
      {
        key: "profile",
        icon: <User size={16} strokeWidth={1.75} />,
        label: t("nav.profile"),
        onClick: () => {
          setNavOpen(false);
          router.push("/profile");
        },
      },
      {
        key: "theme",
        icon: dark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />,
        label: dark ? t("common.lightMode") : t("common.darkMode"),
        onClick: toggleDark,
      },
      { type: "divider" as const },
      {
        key: "logout",
        icon: <LogOut size={16} strokeWidth={1.75} />,
        label: t("auth.signOut"),
        danger: true,
        onClick: logout,
      },
    ],
  };

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        onClick={() => setNavOpen(false)}
        className="flex h-16 items-center gap-3 px-4"
      >
        <Image
          src={brand.logoMark}
          alt=""
          width={40}
          height={40}
          priority
          className="h-10 w-10 object-contain"
        />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-semibold text-fg">{brand.appName}</p>
          <p className="truncate text-xs text-subtle">{brand.shortName}</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="px-2 pb-1.5 text-xs font-medium text-subtle">{g.label}</p>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setNavOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-lg px-2 text-sm transition-colors",
                      active
                        ? "bg-primary-soft font-medium text-primary-text"
                        : "text-muted hover:bg-surface-2 hover:text-fg"
                    )}
                  >
                    <Icon size={17} strokeWidth={active ? 2 : 1.75} />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <Dropdown menu={accountMenu} trigger={["click"]} placement="topLeft">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-surface-2"
          >
            <UserAvatar name={user.fullname} id={user.id} src={user.pictureurl} size={32} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-fg">{user.fullname}</p>
              <p className="truncate text-xs text-subtle">{t(`role.${role}`)}</p>
            </div>
            <ChevronsUpDown size={15} className="shrink-0 text-subtle" />
          </button>
        </Dropdown>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-line bg-surface md:block">
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      <Drawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        placement="left"
        size={264}
        closable={false}
        styles={{ body: { padding: 0 } }}
        className="md:hidden"
      >
        {SidebarBody}
      </Drawer>

      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/90 px-3 backdrop-blur-sm sm:px-4 md:left-60 md:px-6">
        <button
          type="button"
          aria-label={t("common.menu")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg md:hidden"
          onClick={() => setNavOpen(true)}
        >
          <Menu size={18} strokeWidth={1.75} />
        </button>

        <div className="hidden w-full max-w-md sm:block">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label={t("search.title")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg sm:hidden"
            onClick={() => router.push("/search")}
          >
            <Search size={18} strokeWidth={1.75} />
          </button>
          <LangSwitcher />
          <button
            type="button"
            aria-label={dark ? t("common.lightMode") : t("common.darkMode")}
            onClick={toggleDark}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg sm:flex"
          >
            {dark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
          </button>
          <NotificationBell />
          <Dropdown menu={accountMenu} trigger={["click"]} placement="bottomRight">
            <button
              type="button"
              aria-label={t("nav.account")}
              className="ml-1 rounded-full focus-visible:outline-2 md:hidden"
            >
              <UserAvatar name={user.fullname} id={user.id} src={user.pictureurl} size={30} />
            </button>
          </Dropdown>
        </div>
      </header>

      {/* Main */}
      <main className="relative min-h-screen pt-14 md:pl-60">
        {/* Soft color wash behind the top of every page. */}
        <div
          aria-hidden
          className="bg-mesh pointer-events-none absolute inset-x-0 top-14 h-72 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)] md:left-60"
        />
        <div
          key={pathname}
          className={cn(
            "relative mx-auto animate-fade-in px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:pt-8",
            // The SCORM player is content-first: let it use the full width.
            pathname.startsWith("/scorm/") ? "max-w-[1800px]" : "max-w-6xl"
          )}
        >
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {mobileNav.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-14 flex-1 basis-0 flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors",
                active ? "text-primary-text" : "text-subtle"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2 : 1.75} />
              <span className="w-full truncate px-1 text-center">{t(item.labelKey)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="flex h-14 flex-1 basis-0 flex-col items-center justify-center gap-1 text-2xs font-medium text-subtle"
        >
          <LayoutGrid size={20} strokeWidth={1.75} />
          <span>{t("nav.more")}</span>
        </button>
      </nav>
    </div>
  );
}
