"use client";
import type { LucideIcon } from "lucide-react";
import { Award, CalendarClock, CalendarPlus, CalendarX, ClipboardList, Clock, Repeat, Timer } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Card, CardHeader, IconTile, cn, type Tone } from "@/components/ui";
import type { Assignment } from "@/lib/moodle/types";
import { formatDuration } from "@/lib/format";
import { formatWhen } from "./lib";
import { REMAINING_KEY, gradingStatusKey, remainingTime, type AssignmentState, type Remaining } from "./state";

const REMAINING_TONE: Record<Remaining["kind"], Tone> = {
  left: "accent",
  overdue: "danger",
  early: "success",
  underLimit: "success",
  late: "warning",
  overLimit: "warning",
};

const VALUE_TEXT: Partial<Record<Tone, string>> = {
  danger: "text-error-text",
  warning: "text-warning-text",
  success: "text-success-text",
};

function DetailRow({
  icon,
  tone,
  label,
  children,
  emphasize,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  children: React.ReactNode;
  /** Colour the value with the tone (status-like rows). */
  emphasize?: boolean;
}) {
  // The div directly groups one dt/dd pair (valid dl content); the decorative
  // tile sits inside the dt, positioned against the row.
  return (
    <div className="relative flex min-h-15 flex-col justify-center py-3 pl-17 pr-5">
      <dt className="text-xs font-medium text-subtle">
        <IconTile icon={icon} tone={tone} size="sm" className="absolute left-5 top-1/2 -translate-y-1/2" />
        {label}
      </dt>
      <dd className={cn("min-w-0 break-words text-sm font-semibold text-fg", emphasize && VALUE_TEXT[tone])}>
        {children}
      </dd>
    </div>
  );
}

/**
 * Side card with every date, limit and status of the assignment. Rows that
 * depend on the submission status wait until it is known.
 */
export function DetailsCard({ assignment: a, state: s, now }: { assignment: Assignment; state: AssignmentState; now: number }) {
  const t = useT();
  const { locale } = useLocale();
  const remaining = remainingTime(s, now);
  // Under 24 hours left is worth a warning colour.
  const remainingTone: Tone = remaining
    ? remaining.kind === "left" && remaining.seconds < 86400
      ? "warning"
      : REMAINING_TONE[remaining.kind]
    : "neutral";

  return (
    <Card className="lg:sticky lg:top-24">
      <CardHeader title={t("assignment.info")} />
      <dl className="divide-y divide-line/70 pb-2">
        {a.allowsubmissionsfromdate > 0 && (
          <DetailRow icon={CalendarClock} tone="accent" label={t("assignment.allowFrom")}>
            {formatWhen(a.allowsubmissionsfromdate, locale)}
          </DetailRow>
        )}
        <DetailRow icon={CalendarClock} tone="warning" label={t("assignment.due")}>
          {a.duedate > 0 ? formatWhen(a.duedate, locale) : t("assignment.noDue")}
        </DetailRow>
        {s.extension > 0 && (
          <DetailRow icon={CalendarPlus} tone="violet" label={t("assignment.extensionUntil")}>
            {formatWhen(s.extension, locale)}
          </DetailRow>
        )}
        {s.cutoff > 0 && (
          <DetailRow icon={CalendarX} tone="danger" label={t("assignment.cutoff")}>
            {formatWhen(s.cutoff, locale)}
          </DetailRow>
        )}
        {remaining && (
          <DetailRow icon={Clock} tone={remainingTone} label={t("assignment.timeRemaining")} emphasize>
            {t(REMAINING_KEY[remaining.kind], { time: formatDuration(remaining.seconds, t) })}
          </DetailRow>
        )}
        {s.timelimit > 0 && (
          <DetailRow icon={Timer} tone="primary" label={t("assignment.timeLimit")}>
            {formatDuration(s.timelimit, t)}
          </DetailRow>
        )}
        {s.known && s.acceptsSubmissions && (
          <DetailRow
            icon={s.graded ? Award : ClipboardList}
            tone={s.graded ? "success" : "neutral"}
            label={t("assignment.gradingStatus")}
            emphasize
          >
            {t(gradingStatusKey(s.gradingStatus))}
          </DetailRow>
        )}
        {s.known && !!a.maxattempts && a.maxattempts > 0 && (
          <DetailRow icon={Repeat} tone="violet" label={t("assignment.attempts")}>
            {t("assignment.attemptsValue", { n: (s.sub?.attemptnumber ?? 0) + 1, max: a.maxattempts })}
          </DetailRow>
        )}
      </dl>
    </Card>
  );
}
