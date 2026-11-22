"use client";
import Link from "next/link";
import { GraduationCap, PencilLine, Sigma } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Card, IconTile, Progress, RichText, cn } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import { moduleMeta } from "@/lib/module-meta";
import { gradeItemHref, type CourseGradeSummary, type GradeRow } from "./lib";

function RowIcon({ row }: { row: GradeRow }) {
  if (row.kind === "course") {
    return (
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-course-gradient text-white shadow-course">
        <GraduationCap size={17} />
      </span>
    );
  }
  if (row.kind === "category") return <IconTile icon={Sigma} size="sm" tone="neutral" />;
  if (!row.module) return <IconTile icon={PencilLine} size="sm" tone="neutral" />;
  const meta = moduleMeta(row.module);
  return <IconTile icon={meta.icon} size="sm" tone={meta.tone} />;
}

/** Secondary label of a row: the activity type, "Manual item" or "Category total". */
function kindLabel(row: GradeRow, t: (key: string) => string): string | null {
  if (row.kind === "category") return t("grades.categoryTotal");
  if (row.kind === "course") return null;
  return row.module ? t(moduleMeta(row.module).labelKey) : t("grades.manualItem");
}

function ItemCell({ row, courseId }: { row: GradeRow; courseId: number }) {
  const t = useT();
  const { locale } = useLocale();
  const name =
    row.kind === "course"
      ? t("grades.courseTotal")
      : (row.name ?? (row.kind === "category" ? t("grades.categoryTotal") : t("grades.untitledItem")));
  const href = row.kind === "item" ? gradeItemHref(row, courseId) : null;
  const kind = kindLabel(row, t);
  const meta = [
    kind !== name ? kind : null,
    row.kind === "item" && row.dateGraded ? t("grades.gradedOn", { date: formatDate(row.dateGraded, locale) }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div role="rowheader" className="flex min-w-0 gap-3">
      <RowIcon row={row} />
      <div className="min-w-0 flex-1">
        {href ? (
          <Link href={href} className="font-semibold text-fg underline-offset-2 hover:text-primary-text hover:underline">
            {name}
          </Link>
        ) : (
          <span className={cn("text-fg", row.kind === "item" ? "font-semibold" : "font-bold")}>{name}</span>
        )}
        {meta && <p className="mt-0.5 text-xs text-subtle">{meta}</p>}
        {row.feedback && (
          <div className="mt-2 rounded-xl bg-surface-2 p-3">
            <p className="text-2xs font-bold uppercase tracking-wide text-subtle">{t("grades.feedback")}</p>
            <RichText html={row.feedback} className="mt-1 text-[13px]" />
          </div>
        )}
      </div>
    </div>
  );
}

function GradeCell({ row }: { row: GradeRow }) {
  const t = useT();
  const { locale } = useLocale();
  if (row.display === null) {
    const label = row.needsUpdate ? t("grades.recalculating") : row.hidden ? t("grades.hidden") : t("grades.noGradeYet");
    return (
      <div role="cell" className="text-right md:text-left">
        <Badge tone={row.needsUpdate ? "warning" : "neutral"}>{label}</Badge>
      </div>
    );
  }
  return (
    <div role="cell" className="flex flex-col items-end gap-1 md:items-start">
      <span className="whitespace-nowrap">
        <span className="text-base font-extrabold tabular-nums text-fg">{row.display}</span>
        {row.max != null && <span className="text-sm tabular-nums text-subtle"> / {formatNumber(row.max, locale)}</span>}
      </span>
      {row.passed === true && <Badge tone="success" dot>{t("grades.passed")}</Badge>}
      {row.passed === false && <Badge tone="danger" dot>{t("grades.failed")}</Badge>}
    </div>
  );
}

function PercentCell({ row }: { row: GradeRow }) {
  const t = useT();
  const { locale } = useLocale();
  if (row.percent === null) {
    return (
      <div role="cell" className="hidden text-subtle md:block">
        <span aria-hidden>—</span>
        <span className="sr-only">{t("grades.noPercentage")}</span>
      </div>
    );
  }
  return (
    <div role="cell" className="col-span-2 flex items-center gap-2 md:col-span-1">
      <Progress value={row.percent} tone="course" size="sm" label={t("grades.percentage")} />
      <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-muted">
        {formatNumber(row.percent, locale, 1)}%
      </span>
    </div>
  );
}

const ROW_STYLE: Record<GradeRow["kind"], string> = {
  item: "",
  category: "bg-surface-2/70",
  course: "bg-course-soft",
};

/**
 * Grade items of one course as an ARIA table that reflows into cards on
 * phones. The percentage column only appears when Moodle sends percentages
 * (or a range) for at least one row.
 */
export function GradeItemsTable({
  summary,
  courseId,
  courseName,
}: {
  summary: CourseGradeSummary;
  courseId: number;
  courseName: string;
}) {
  const t = useT();
  const rows = summary.total ? [...summary.rows, summary.total] : summary.rows;
  const showPercent = rows.some((r) => r.percent !== null);
  const cols = showPercent
    ? "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_9rem_11rem]"
    : "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_10rem]";

  return (
    <Card className="overflow-hidden animate-fade-in-up">
      <div role="table" aria-label={t("grades.itemsOf", { course: courseName })}>
        <div role="rowgroup" className="sr-only md:not-sr-only">
          <div role="row" className={cn("grid gap-4 border-b border-line px-5 py-3 text-xs font-bold text-subtle", cols)}>
            <span role="columnheader">{t("grades.item")}</span>
            <span role="columnheader">{t("grades.grade")}</span>
            {showPercent && <span role="columnheader">{t("grades.percentage")}</span>}
          </div>
        </div>
        <div role="rowgroup" className="divide-y divide-line">
          {rows.map((row) => (
            <div key={row.id} role="row" className={cn("grid items-start gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5", cols, ROW_STYLE[row.kind])}>
              <ItemCell row={row} courseId={courseId} />
              <GradeCell row={row} />
              {showPercent && <PercentCell row={row} />}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
