"use client";
import { useMemo } from "react";
import { AppWindow, Compass, ExternalLink, Globe, Mail, Unlink, type LucideIcon } from "lucide-react";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { Button, Card, IconTile, QueryState, buttonClass } from "@/components/ui";
import { resolveLinkTarget, type LinkTarget } from "./link-target";
import {
  ActivityIntro,
  ActivityNotFound,
  ContentSkeleton,
  INSTANCE_CACHE_MS,
  useLogView,
  type ActivityCm,
} from "./shared";

/** mod_url_get_urls_by_courses item (only the fields the viewer reads). */
interface UrlInstance {
  coursemodule: number;
  intro?: string;
  externalurl: string;
}

interface LinkView {
  icon: LucideIcon;
  title: string;
  detail: string | null;
  hint: string;
}

function useLinkView(target: LinkTarget, raw: string): LinkView {
  const t = useT();
  switch (target.kind) {
    case "internal":
      return { icon: Compass, title: t("activity.url.internalTitle"), detail: null, hint: t("activity.url.internalHint") };
    case "external":
      return { icon: Globe, title: t("activity.externalLink"), detail: target.host, hint: t("activity.externalHint") };
    case "app":
      return target.email
        ? { icon: Mail, title: t("activity.url.emailTitle"), detail: target.detail, hint: t("activity.url.emailHint") }
        : { icon: AppWindow, title: t("activity.url.appTitle"), detail: target.detail, hint: t("activity.url.appHint") };
    case "invalid":
      return { icon: Unlink, title: t("activity.externalLink"), detail: raw, hint: t("activity.url.invalidHint") };
  }
}

/** The call to action: portal route, new tab for websites, plain link for app schemes. */
function LinkAction({ target }: { target: LinkTarget }) {
  const t = useT();
  const cls = "w-full sm:w-auto";
  switch (target.kind) {
    case "internal":
      return (
        <Button href={target.href} variant="gradient" size="lg" className={cls}>
          {t("common.open")}
        </Button>
      );
    case "external":
      return (
        <Button href={target.href} external variant="gradient" size="lg" className={cls}>
          {t("activity.openLink")}
          <ExternalLink size={16} strokeWidth={2} aria-hidden />
        </Button>
      );
    case "app":
      // Not a Next.js route and not a new tab: the browser hands it to the app.
      return (
        <a href={target.href} className={buttonClass("gradient", "lg", cls)}>
          {t("activity.openLink")}
        </a>
      );
    case "invalid":
      return null;
  }
}

function LinkCard({ target, raw }: { target: LinkTarget; raw: string }) {
  const view = useLinkView(target, raw);

  return (
    <Card className="animate-fade-in-up p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <IconTile icon={view.icon} tone={target.kind === "invalid" ? "neutral" : "accent"} solid size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-fg">{view.title}</p>
          {view.detail && (
            <p className="mt-0.5 truncate text-sm font-semibold text-accent" title={raw}>
              {view.detail}
            </p>
          )}
          <p className="mt-1 text-[13px] text-subtle">{view.hint}</p>
        </div>
        <LinkAction target={target} />
      </div>
    </Card>
  );
}

/** mod_url: where the link goes, opened in the portal when it maps to a portal page. */
export function UrlViewer({ cm }: { cm: ActivityCm }) {
  useLogView("mod_url_view_url", { urlid: cm.instance });
  const { data, loading, error } = useMoodle<{ urls: UrlInstance[] }>(
    "mod_url_get_urls_by_courses",
    { courseids: [cm.course] },
    false,
    { cacheMs: INSTANCE_CACHE_MS }
  );
  const url = data?.urls.find((u) => u.coursemodule === cm.id);
  const target = useMemo(() => (url ? resolveLinkTarget(url.externalurl) : null), [url]);

  return (
    <QueryState loading={loading} error={error} skeleton={<ContentSkeleton />}>
      {!url || !target ? (
        <ActivityNotFound courseId={cm.course} />
      ) : (
        <div className="space-y-5">
          <ActivityIntro html={url.intro} />
          <LinkCard target={target} raw={url.externalurl} />
        </div>
      )}
    </QueryState>
  );
}
