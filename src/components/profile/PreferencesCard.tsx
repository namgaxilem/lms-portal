"use client";
import { useId, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Languages, Moon, Sun } from "lucide-react";
import { Segmented } from "antd";
import { useT } from "@/i18n/I18nProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { LangSwitcher } from "@/components/LangSwitcher";
import { Card, CardHeader, IconTile, type Tone } from "@/components/ui";

function PreferenceRow({
  icon,
  tone,
  label,
  hint,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  hint: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-3 py-4">
      <IconTile icon={icon} tone={tone} size="sm" />
      <div className="min-w-0 flex-1">
        <p id={id} className="text-sm font-semibold text-fg">
          {label}
        </p>
        <p className="text-xs text-subtle">{hint}</p>
      </div>
      <div role="group" aria-labelledby={id} className="shrink-0">
        {children}
      </div>
    </div>
  );
}

/** Portal-side preferences: interface language (cookie) and light/dark theme (this browser). */
export function PreferencesCard() {
  const t = useT();
  const { dark, setDark } = useTheme();
  return (
    <Card className="animate-fade-in-up">
      <CardHeader title={t("profile.preferences")} />
      <div className="divide-y divide-line px-5 pb-1">
        <PreferenceRow icon={Languages} tone="accent" label={t("profile.language")} hint={t("profile.languageHint")}>
          <LangSwitcher />
        </PreferenceRow>
        <PreferenceRow icon={dark ? Moon : Sun} tone="violet" label={t("common.theme")} hint={t("profile.themeHint")}>
          <Segmented
            aria-label={t("common.theme")}
            value={dark ? "dark" : "light"}
            onChange={(value) => setDark(value === "dark")}
            options={[
              { value: "light", label: t("profile.themeLight"), icon: <Sun size={14} aria-hidden /> },
              { value: "dark", label: t("profile.themeDark"), icon: <Moon size={14} aria-hidden /> },
            ]}
            className="shrink-0 font-semibold"
          />
        </PreferenceRow>
      </div>
    </Card>
  );
}
