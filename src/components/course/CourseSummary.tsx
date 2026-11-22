"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Button, Card, RichText, cn } from "@/components/ui";
import { plainText } from "@/lib/format";

/** Longer than this (or with media), the summary starts collapsed. */
const LONG_TEXT = 280;

/** "About this course": the course summary (Moodle HTML), collapsible when long. */
export function CourseSummary({ html }: { html: string }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const long = plainText(html).length > LONG_TEXT || /<(img|iframe|video|table)\b/i.test(html);
  const collapsed = long && !expanded;
  return (
    <Card className="mb-5 p-5">
      <h2 className="font-extrabold text-fg">{t("course.about")}</h2>
      <div id="course-summary" className={cn("relative mt-3", collapsed && "max-h-32 overflow-hidden")}>
        <RichText html={html} />
        {collapsed && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-surface to-transparent"
          />
        )}
      </div>
      {long && (
        <Button
          variant="ghost"
          size="md"
          className="-ml-2 mt-2"
          aria-expanded={expanded}
          aria-controls="course-summary"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown size={16} aria-hidden className={cn("transition-transform", expanded && "rotate-180")} />
          {t(expanded ? "course.showLess" : "course.showMore")}
        </Button>
      )}
    </Card>
  );
}
