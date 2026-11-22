"use client";
import { Info, Mail, Phone, ShieldCheck } from "lucide-react";
import { useBrand } from "@/components/providers/BrandProvider";
import { useT } from "@/i18n/I18nProvider";
import { LangSwitcher } from "@/components/LangSwitcher";
import { Card } from "@/components/ui";
import { telHref } from "@/components/public/brand-ui";
import type { LoginSiteSettings } from "../types";
import { BrandPanel } from "./BrandPanel";
import { LoginForm } from "./LoginForm";
import { PublicHtml } from "./PublicHtml";

/**
 * Login screen: brand panel (compact header on phones, side panel on desktop),
 * the sign-in card overlapping it, then Moodle's sign-in instructions and the
 * school's support contacts when configured.
 */
export function LoginView({
  sessionExpired,
  settings,
  year,
}: {
  sessionExpired: boolean;
  settings: LoginSiteSettings;
  /** Copyright year, computed on the server so hydration cannot disagree around New Year. */
  year: number;
}) {
  return (
    <main className="relative min-h-dvh bg-canvas text-fg lg:flex">
      {/* 14px = the switch's 12px radius plus the 2px padding, so the corners stay concentric. */}
      <div className="absolute right-4 top-8 z-10 rounded-[14px] bg-surface p-0.5 shadow-sm sm:right-6 lg:top-6">
        <LangSwitcher />
      </div>
      <BrandPanel year={year} />
      <div className="flex flex-1 flex-col items-center px-4 pb-10 sm:px-6 lg:justify-center lg:py-16">
        <div className="-mt-12 w-full max-w-md animate-fade-in-up lg:mt-0">
          <LoginForm sessionExpired={sessionExpired} settings={settings} />
          {settings.instructions && <Instructions html={settings.instructions} />}
          <HelpFooter />
        </div>
      </div>
    </main>
  );
}

function Instructions({ html }: { html: string }) {
  const t = useT();
  return (
    <Card className="mt-4 p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-fg">
        <Info size={16} strokeWidth={2} aria-hidden className="text-primary-text" />
        {t("auth.instructionsTitle")}
      </h2>
      <PublicHtml html={html} className="mt-2 text-[13px] text-fg" />
    </Card>
  );
}

function HelpFooter() {
  const t = useT();
  const { support } = useBrand();
  const link = "inline-flex min-h-10 items-center gap-1.5 rounded-md font-semibold text-primary-text hover:underline";
  return (
    <div className="mt-6 space-y-3 text-center text-xs text-subtle">
      {(support.email || support.phone) && (
        <div className="space-y-1">
          <p>{t("auth.needHelp")}</p>
          <p className="flex flex-wrap items-center justify-center gap-x-4 text-[13px]">
            {support.email && (
              <a href={`mailto:${support.email}`} className={link}>
                <Mail size={14} strokeWidth={2} aria-hidden />
                <span className="break-all">{support.email}</span>
              </a>
            )}
            {support.phone && (
              <a href={telHref(support.phone)} className={link}>
                <Phone size={14} strokeWidth={2} aria-hidden />
                {support.phone}
              </a>
            )}
          </p>
        </div>
      )}
      <p className="flex items-center justify-center gap-1.5">
        <ShieldCheck size={14} strokeWidth={1.75} aria-hidden />
        {t("auth.secureNote")}
      </p>
    </div>
  );
}
