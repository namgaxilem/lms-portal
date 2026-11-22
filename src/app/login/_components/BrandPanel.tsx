"use client";
import { Award, CalendarClock, MessagesSquare, PlayCircle } from "lucide-react";
import { useBrand } from "@/components/providers/BrandProvider";
import { useT } from "@/i18n/I18nProvider";
import { BrandMark } from "@/components/public/brand-ui";

const FEATURES = [
  { icon: PlayCircle, key: "auth.heroFeatureA" },
  { icon: Award, key: "auth.heroFeatureC" },
  { icon: CalendarClock, key: "auth.heroFeatureD" },
  { icon: MessagesSquare, key: "auth.heroFeatureB" },
];

/**
 * School identity on the brand gradient: a compact header (holding the page's
 * h1) on phones, a full-height side panel with the pitch from lg up. A
 * <header> inside <main> (not an <aside>), so the page title is not put in a
 * complementary landmark.
 */
export function BrandPanel({ year }: { year: number }) {
  const brand = useBrand();
  const t = useT();
  return (
    <header className="relative isolate overflow-hidden rounded-b-hero bg-brand-gradient px-4 pb-20 pt-6 text-white sm:px-6 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[46%] lg:flex-col lg:justify-between lg:rounded-none lg:p-12 xl:p-14">
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-white/10" />
      <span aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 -z-10 size-96 rounded-full border-[48px] border-white/[0.06]" />

      <div className="flex items-center gap-3 pr-28 lg:pr-0">
        <BrandMark src={brand.logoMark} size="xl" />
        <div className="min-w-0 leading-tight">
          <h1 className="text-lg font-extrabold tracking-tight lg:text-xl">{brand.appName}</h1>
          <p className="truncate text-[13px] text-white/80 lg:whitespace-normal">{brand.name}</p>
        </div>
      </div>

      <div className="hidden max-w-lg lg:block">
        {brand.tagline && (
          <p className="mb-5 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
            {brand.tagline}
          </p>
        )}
        <p className="text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
          {t("auth.heroTitle")} <span className="text-white/75">{t("auth.heroAccent")}</span>
        </p>
        <p className="mt-4 text-base leading-relaxed text-white/85">{t("auth.panelSubtitle")}</p>
        <ul className="mt-8 flex flex-wrap gap-2">
          {FEATURES.map(({ icon: Icon, key }) => (
            <li
              key={key}
              className="flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold ring-1 ring-white/25 backdrop-blur"
            >
              <Icon size={15} strokeWidth={2} aria-hidden />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>

      <p className="hidden text-xs text-white/70 lg:block">
        © {year} {brand.name}
      </p>
    </header>
  );
}
