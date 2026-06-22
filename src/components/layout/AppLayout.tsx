"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Avatar, Dropdown } from "antd";
import { useSession } from "@/components/providers/SessionProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useT } from "@/i18n/I18nProvider";
import { LangSwitcher } from "@/components/LangSwitcher";
import { MaterialIcon } from "@/components/MaterialIcon";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { brand } from "@/config/brand";

interface NavItem {
  href: string;
  icon: string;
  labelKey: string;
}

const studentNav: NavItem[] = [
  { href: "/dashboard", icon: "dashboard", labelKey: "nav.dashboard" },
  { href: "/courses", icon: "school", labelKey: "nav.courses" },
  { href: "/grades", icon: "workspace_premium", labelKey: "nav.grades" },
  { href: "/reports", icon: "monitoring", labelKey: "nav.reports" },
  { href: "/notifications", icon: "notifications", labelKey: "nav.notifications" },
  { href: "/messages", icon: "chat", labelKey: "nav.messages" },
];

// Staff-only. The teacher/ route segment is guarded server-side (teacher/layout.tsx).
const teacherNav: NavItem[] = [
  { href: "/teacher/grading", icon: "fact_check", labelKey: "nav.grading" },
];

const mobileNav: NavItem[] = [
  { href: "/dashboard", icon: "home", labelKey: "nav.dashboard" },
  { href: "/courses", icon: "menu_book", labelKey: "nav.courses" },
  { href: "/messages", icon: "forum", labelKey: "nav.messages" },
  { href: "/notifications", icon: "notifications", labelKey: "nav.notifications" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const { dark, toggle: toggleDark } = useTheme();

  const accountRole =
    user.highestRole ?? (user.isSiteAdmin ? "admin" : "student");
  const isStaff = accountRole === "admin" || accountRole === "teacher";
  const nav = isStaff ? [...studentNav, ...teacherNav] : studentNav;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const initials = user.fullname
    .split(" ")
    .map((p) => p[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const SidebarBody = (
    <>
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden">
          <Image
            src="/images/main-logo.png"
            alt={brand.name}
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-headline-sm text-headline-sm font-bold leading-tight text-primary">
            {brand.name}
          </h1>
          <p className="text-[11px] font-medium text-on-surface-variant">
            {brand.tagline}
          </p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-4">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setNavOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                active
                  ? "bg-primary/5 font-bold text-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <MaterialIcon name={item.icon} fill={active} />
              <span className="font-body-md text-body-md">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-outline-variant/20 px-4 py-4">
        <button
          onClick={toggleDark}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          <MaterialIcon name={dark ? "light_mode" : "dark_mode"} />
          <span className="font-body-md text-body-md">
            {dark ? t("common.lightMode") : t("common.darkMode")}
          </span>
        </button>
      </div>

    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 z-40 hidden h-screen w-[280px] flex-col border-r border-outline-variant/30 bg-surface card-elevation md:flex">
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={() => setNavOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 flex w-[280px] flex-col bg-surface animate-scale-in">
            {SidebarBody}
          </aside>
        </div>
      )}

      {/* Top bar */}
      <header className="fixed top-0 right-0 left-0 z-30 flex h-16 items-center justify-between gap-3 bg-surface/80 px-4 backdrop-blur-md md:left-[280px] md:px-gutter">
        <div className="flex flex-1 items-center gap-2">
          <button
            aria-label="Menu"
            className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container md:hidden"
            onClick={() => setNavOpen(true)}
          >
            <MaterialIcon name="menu" />
          </button>
          <div className="hidden w-full max-w-md sm:block">
            <GlobalSearch />
          </div>
          <button
            aria-label={t("search.title")}
            className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container sm:hidden"
            onClick={() => router.push("/search")}
          >
            <MaterialIcon name="search" />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LangSwitcher />

          <NotificationBell />

          <Dropdown
            menu={{
              items: [
                {
                  key: "profile",
                  icon: <MaterialIcon name="person" className="!text-base" />,
                  label: t("profile.title"),
                  onClick: () => router.push("/profile"),
                },
                { type: "divider" },
                {
                  key: "logout",
                  icon: <MaterialIcon name="logout" className="!text-base" />,
                  label: t("auth.signOut"),
                  onClick: logout,
                },
              ],
            }}
          >
            <button className="flex items-center gap-2 rounded-full pl-1 transition-colors hover:bg-surface-container">
              <Avatar
                src={user.pictureurl || undefined}
                className="bg-primary-container text-on-primary"
              >
                {initials}
              </Avatar>
              <div className="hidden flex-col sm:flex">
                <span className="font-label-md text-label-md font-semibold text-on-surface">
                  {user.fullname}
                </span>
                <span className="text-[11px] font-medium text-on-surface-variant capitalize">
                  {t(`role.${accountRole}`)}
                </span>
              </div>
            </button>
          </Dropdown>
        </div>
      </header>

      {/* Main */}
      <main className="min-h-screen pt-16 md:pl-[280px]">
        <div
          key={pathname}
          className="mx-auto max-w-7xl animate-fade-in p-4 pb-24 sm:p-6 md:pb-6 lg:p-lg"
        >
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-stretch border-t border-outline-variant/20 bg-surface px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0px_-4px_20px_rgba(55,48,163,0.08)] md:hidden">
        {mobileNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 basis-0 flex-col items-center justify-center gap-0.5 py-0.5 transition-transform active:scale-95"
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                  active
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant"
                }`}
              >
                <MaterialIcon
                  name={item.icon}
                  fill={active}
                  className="!text-[22px]"
                />
              </span>
              <span
                className={`w-full truncate text-center text-[10px] font-semibold ${
                  active ? "text-on-surface" : "text-on-surface-variant"
                }`}
              >
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
