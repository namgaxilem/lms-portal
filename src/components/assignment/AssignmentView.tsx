"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { App } from "antd";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  CalendarClock,
  CalendarX,
  CircleCheck,
  Clock,
  FilePlus2,
  FileQuestion,
  Hourglass,
  LoaderCircle,
  Lock,
  Pencil,
  Play,
  Send,
  Timer,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { useSession } from "@/components/providers/SessionProvider";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  QueryState,
  RichText,
  Skeleton,
  cn,
} from "@/components/ui";
import { moodleClient, useMoodle } from "@/lib/client-api";
import type {
  AssignSubmission,
  Assignment,
  AssignmentsResult,
  CourseModuleInfo,
  SubmissionStatus,
} from "@/lib/moodle/types";
import { FeedbackCard, PreviousAttempts } from "./FeedbackPanel";
import { FileList } from "./FileList";
import { StatusBadge } from "./StatusBadge";
import { SubmissionEditor } from "./SubmissionEditor";
import {
  currentSubmission,
  formatClock,
  formatDateTime,
  formatDuration,
  onlineText,
  submissionFiles,
  submissionSettings,
  warningMessages,
  type WsWarning,
} from "./lib";
import { useNow } from "./useNow";

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-2/3" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

/** Native student view of an assignment: instructions, own submission, grade and feedback. */
export function AssignmentView({ cmid }: { cmid: number }) {
  const t = useT();
  const cmQ = useMoodle<CourseModuleInfo>("core_course_get_course_module", { cmid }, !cmid);
  const cm = cmQ.data?.cm;
  const isAssign = cm?.modname === "assign";

  const listQ = useMoodle<AssignmentsResult>(
    "mod_assign_get_assignments",
    { courseids: [cm?.course] },
    !isAssign
  );
  const statusQ = useMoodle<SubmissionStatus>(
    "mod_assign_get_submission_status",
    { assignid: cm?.instance },
    !isAssign
  );

  const assignId = isAssign ? cm?.instance : undefined;
  useEffect(() => {
    if (!assignId) return;
    // View logging only (completion/"viewed" events); failures don't matter.
    moodleClient("mod_assign_view_assign", { assignid: assignId }).catch(() => {});
    moodleClient("mod_assign_view_submission_status", { assignid: assignId }).catch(() => {});
  }, [assignId]);

  const course = listQ.data?.courses.find((c) => c.id === cm?.course);
  const assignment = course?.assignments.find((a) => a.id === cm?.instance);
  const loading = cmQ.loading || listQ.loading || (!!cm && isAssign && !listQ.data && !listQ.error);

  return (
    <QueryState
      loading={loading}
      error={cmQ.error ?? listQ.error}
      skeleton={<PageSkeleton />}
    >
      {!assignment ? (
        <EmptyState
          icon={FileQuestion}
          title={t("assignment.notFound")}
          hint={t("assignment.notFoundHint")}
          action={
            <Button variant="secondary" href={cm ? `/courses/${cm.course}` : "/courses"}>
              <ArrowLeft size={16} strokeWidth={1.75} />
              {t("common.back")}
            </Button>
          }
        />
      ) : (
        <AssignmentDetail
          assignment={assignment}
          courseName={course?.fullname ?? ""}
          status={statusQ.data}
          statusLoading={statusQ.loading}
          statusError={statusQ.error}
          reload={statusQ.reload}
        />
      )}
    </QueryState>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  tone?: "error" | "warning" | "success";
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <Icon size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-subtle" />
      <div className="min-w-0">
        <p className="text-xs text-subtle">{label}</p>
        <p
          className={cn(
            "mt-0.5 text-sm text-fg",
            tone === "error" && "text-error",
            tone === "warning" && "text-[#b45309] dark:text-warning",
            tone === "success" && "text-success"
          )}
        >
          {children}
        </p>
      </div>
    </div>
  );
}

function AssignmentDetail({
  assignment: a,
  courseName,
  status,
  statusLoading,
  statusError,
  reload,
}: {
  assignment: Assignment;
  courseName: string;
  status: SubmissionStatus | null;
  statusLoading: boolean;
  statusError: string | null;
  reload: () => Promise<void> | void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { user } = useSession();
  const { message, modal } = App.useApp();

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<"start" | "submit" | "remove" | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  const la = status?.lastattempt;
  const sub: AssignSubmission | undefined = currentSubmission(status, a);
  const settings = submissionSettings(a);
  const acceptsSubmissions = !a.nosubmissions && (settings.onlinetext || settings.file);

  const timelimit = la?.timelimit || a.timelimit || 0;
  const subStatus = sub?.status ?? "new";
  const started = !!sub?.timestarted;
  const timedRunning = timelimit > 0 && started && subStatus !== "submitted";
  const now = useNow(timedRunning ? 1000 : 30_000);

  const extension = la?.extensionduedate || 0;
  const due = Math.max(a.duedate || 0, extension);
  const cutoff = a.cutoffdate || 0;
  const submitted = subStatus === "submitted";
  const graded = !!la?.graded || la?.gradingstatus === "graded";
  const overdue = due > 0 && now > due && !submitted;
  const late = submitted && due > 0 && !!sub && sub.timemodified > due;
  const notOpen = (a.allowsubmissionsfromdate || 0) > now;
  const closed = cutoff > 0 && now > Math.max(cutoff, extension);
  const canEdit = !!la && la.submissionsenabled && la.canedit && !la.locked && !notOpen;
  const needsStart =
    timelimit > 0 && !started && (subStatus === "new" || subStatus === "reopened") && canEdit;
  const timeLeft = timedRunning ? (sub!.timestarted ?? 0) + timelimit - now : null;

  const text = onlineText(sub?.plugins);
  const files = submissionFiles(sub?.plugins);
  const hasContent = !!text || files.length > 0;

  const introFiles = a.introattachments?.length
    ? a.introattachments
    : (status?.assignmentdata?.attachments?.intro ?? []);
  const activity = status?.assignmentdata?.activity;
  const activityFiles = status?.assignmentdata?.attachments?.activity ?? [];

  const afterAction = async () => {
    setEditing(false);
    setSubmitErrors([]);
    setAccepted(false);
    await reload();
  };

  const start = async () => {
    setBusy("start");
    try {
      const res = await moodleClient<{ submissionid: number; warnings?: WsWarning[] }>(
        "mod_assign_start_submission",
        { assignid: a.id }
      );
      const msgs = warningMessages(res?.warnings);
      if (msgs.length) message.error(msgs.join(" "));
      await reload();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const submitForGrading = async () => {
    setSubmitErrors([]);
    if (a.requiresubmissionstatement && !accepted) {
      setSubmitErrors([t("assignment.statement.required")]);
      return;
    }
    setBusy("submit");
    try {
      const warnings = await moodleClient<WsWarning[]>("mod_assign_submit_for_grading", {
        assignmentid: a.id,
        acceptsubmissionstatement: !!a.requiresubmissionstatement && accepted,
      });
      const msgs = warningMessages(warnings);
      if (msgs.length) {
        setSubmitErrors(msgs);
        return;
      }
      message.success(t("assignment.submit.done"));
      await afterAction();
    } catch (e) {
      setSubmitErrors([(e as Error).message]);
    } finally {
      setBusy(null);
    }
  };

  const remove = () => {
    modal.confirm({
      title: t("assignment.remove.confirmTitle"),
      content: t("assignment.remove.confirmBody"),
      okText: t("assignment.remove.action"),
      okButtonProps: { danger: true },
      cancelText: t("assignment.editor.cancel"),
      onOk: async () => {
        setBusy("remove");
        try {
          const res = await moodleClient<WsWarning[] | { status?: boolean; warnings?: WsWarning[] }>(
            "mod_assign_remove_submission",
            { userid: user.id, assignid: a.id }
          );
          const msgs = warningMessages(Array.isArray(res) ? res : res?.warnings);
          if (msgs.length) {
            message.error(msgs.join(" "));
            return;
          }
          message.success(t("assignment.remove.done"));
          await afterAction();
        } catch (e) {
          message.error((e as Error).message);
        } finally {
          setBusy(null);
        }
      },
    });
  };

  /* ---------------- Header badges ---------------- */
  const badges = (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {acceptsSubmissions && <StatusBadge status={subStatus} />}
      {graded && (
        <Badge tone="success">
          <CircleCheck size={14} strokeWidth={1.75} />
          {t("assignment.status.graded")}
        </Badge>
      )}
      {acceptsSubmissions && overdue && <Badge tone="danger">{t("assignment.badge.overdue")}</Badge>}
      {late && <Badge tone="warning">{t("assignment.badge.late")}</Badge>}
      {extension > 0 && <Badge tone="violet">{t("assignment.badge.extension")}</Badge>}
      {la?.locked && (
        <Badge tone="neutral">
          <Lock size={14} strokeWidth={1.75} />
          {t("assignment.badge.locked")}
        </Badge>
      )}
    </div>
  );

  /* ---------------- Time remaining ---------------- */
  let remaining: { text: string; tone?: "error" | "warning" | "success" } | null = null;
  if (due > 0 && acceptsSubmissions) {
    if (submitted) {
      remaining = late
        ? {
            text: t("assignment.time.submittedLate", { time: formatDuration(sub!.timemodified - due, t) }),
            tone: "warning",
          }
        : { text: t("assignment.time.submittedEarly", { time: formatDuration(due - sub!.timemodified, t) }), tone: "success" };
    } else if (now <= due) {
      remaining = {
        text: t("assignment.time.left", { time: formatDuration(due - now, t) }),
        tone: due - now < 86400 ? "warning" : undefined,
      };
    } else {
      remaining = { text: t("assignment.time.overdue", { time: formatDuration(now - due, t) }), tone: "error" };
    }
  }

  const blockedReason = !acceptsSubmissions
    ? null
    : notOpen
      ? t("assignment.blocked.notOpen", { date: formatDateTime(a.allowsubmissionsfromdate, locale) })
      : la?.locked
        ? t("assignment.blocked.locked")
        : closed
          ? t("assignment.blocked.closed")
          : la && !canEdit && !submitted
            ? t("assignment.blocked.generic")
            : null;

  return (
    <div>
      <PageHeader
        eyebrow={
          <Link
            href={`/courses/${a.course}`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-fg"
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            {courseName || t("common.back")}
          </Link>
        }
        title={a.name}
        description={badges}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Instructions */}
          <Card>
            <CardHeader title={t("assignment.instructions")} />
            <div className="space-y-4 p-5">
              {a.intro?.trim() ? (
                <RichText html={a.intro} />
              ) : (
                <p className="text-sm text-subtle">{t("assignment.noInstructions")}</p>
              )}
              <FileList files={introFiles} />
              {(activity?.trim() || activityFiles.length > 0) && (
                <div className="border-t border-line pt-4">
                  <p className="mb-2 text-[13px] font-medium text-muted">
                    {t("assignment.activityInstructions")}
                  </p>
                  {activity?.trim() && <RichText html={activity} />}
                  <FileList files={activityFiles} className="mt-3" />
                </div>
              )}
            </div>
          </Card>

          {acceptsSubmissions && (
            <QueryState loading={statusLoading && !status} error={statusError}>
              {timeLeft !== null && (
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3",
                    timeLeft <= 300
                      ? "border-error/30 bg-error-soft text-error"
                      : "border-line bg-surface text-fg"
                  )}
                  role="timer"
                >
                  <Timer size={18} strokeWidth={1.75} className="shrink-0" />
                  <span className="text-sm">
                    {timeLeft > 0 ? t("assignment.timed.remaining") : t("assignment.timed.expired")}
                  </span>
                  {timeLeft > 0 && (
                    <span className="ml-auto font-mono text-base font-semibold tabular-nums">
                      {formatClock(timeLeft)}
                    </span>
                  )}
                </div>
              )}

              {editing ? (
                <SubmissionEditor
                  assignment={a}
                  settings={settings}
                  submission={sub}
                  onSaved={afterAction}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <Card>
                  <CardHeader
                    title={t("assignment.yourSubmission")}
                    description={
                      sub?.timemodified && hasContent
                        ? t("assignment.lastModified", {
                            date: formatDateTime(sub.timemodified, locale),
                          })
                        : undefined
                    }
                    action={
                      canEdit && !needsStart ? (
                        <div className="flex items-center gap-2">
                          {hasContent && subStatus !== "new" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={remove}
                              disabled={busy !== null}
                              aria-label={t("assignment.remove.action")}
                            >
                              {busy === "remove" ? (
                                <LoaderCircle size={16} strokeWidth={1.75} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} strokeWidth={1.75} />
                              )}
                              <span className="hidden sm:inline">{t("assignment.remove.action")}</span>
                            </Button>
                          )}
                          <Button size="sm" onClick={() => setEditing(true)} disabled={busy !== null}>
                            {hasContent ? (
                              <Pencil size={16} strokeWidth={1.75} />
                            ) : (
                              <FilePlus2 size={16} strokeWidth={1.75} />
                            )}
                            {hasContent ? t("assignment.edit") : t("assignment.add")}
                          </Button>
                        </div>
                      ) : undefined
                    }
                  />
                  <div className="space-y-4 p-5">
                    {needsStart ? (
                      <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
                          <Hourglass size={18} strokeWidth={1.75} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-fg">
                            {t("assignment.timed.title", { time: formatDuration(timelimit, t) })}
                          </p>
                          <p className="mt-1 max-w-md text-[13px] text-subtle">
                            {t("assignment.timed.hint")}
                          </p>
                        </div>
                        <Button onClick={start} disabled={busy !== null}>
                          {busy === "start" ? (
                            <LoaderCircle size={16} strokeWidth={1.75} className="animate-spin" />
                          ) : (
                            <Play size={16} strokeWidth={1.75} />
                          )}
                          {t("assignment.timed.start")}
                        </Button>
                      </div>
                    ) : hasContent ? (
                      <>
                        {text && (
                          <div>
                            <p className="mb-2 text-[13px] font-medium text-muted">
                              {t("assignment.onlineText")}
                            </p>
                            <div className="rounded-lg border border-line bg-surface-2 p-4">
                              <RichText html={text.text} plain={text.format === 2} />
                            </div>
                          </div>
                        )}
                        {files.length > 0 && (
                          <div>
                            <p className="mb-2 text-[13px] font-medium text-muted">
                              {t("assignment.files")}
                            </p>
                            <FileList files={files} />
                          </div>
                        )}
                      </>
                    ) : (
                      <EmptyState
                        compact
                        icon={FilePlus2}
                        title={t("assignment.noSubmission")}
                        hint={blockedReason ?? (canEdit ? t("assignment.noSubmissionHint") : undefined)}
                      />
                    )}
                    {hasContent && blockedReason && (
                      <p className="flex items-center gap-2 text-[13px] text-subtle">
                        <Lock size={14} strokeWidth={1.75} />
                        {blockedReason}
                      </p>
                    )}
                  </div>
                </Card>
              )}

              {!editing && a.submissiondrafts && la?.cansubmit ? (
                <Card className="border-primary/30">
                  <CardHeader
                    title={t("assignment.submit.title")}
                    description={t("assignment.submit.hint")}
                  />
                  <div className="space-y-4 p-5">
                    {!!a.requiresubmissionstatement && (
                      <label className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0 accent-primary"
                          checked={accepted}
                          onChange={(e) => setAccepted(e.target.checked)}
                          disabled={busy !== null}
                        />
                        {a.submissionstatement ? (
                          <RichText html={a.submissionstatement} className="text-[13px]" />
                        ) : (
                          <span className="text-[13px] text-fg">
                            {t("assignment.statement.default")}
                          </span>
                        )}
                      </label>
                    )}
                    {submitErrors.length > 0 && (
                      <div
                        role="alert"
                        className="flex items-start gap-2 rounded-lg border border-error/30 bg-error-soft px-3 py-2.5 text-[13px] text-error"
                      >
                        <TriangleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                        <ul className="space-y-0.5">
                          {submitErrors.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button
                        onClick={submitForGrading}
                        disabled={busy !== null || (!!a.requiresubmissionstatement && !accepted)}
                      >
                        {busy === "submit" ? (
                          <LoaderCircle size={16} strokeWidth={1.75} className="animate-spin" />
                        ) : (
                          <Send size={16} strokeWidth={1.75} />
                        )}
                        {t("assignment.submit.action")}
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : null}
            </QueryState>
          )}

          <FeedbackCard feedback={status?.feedback} />
          {status?.previousattempts && <PreviousAttempts attempts={status.previousattempts} />}
        </div>

        {/* Side info */}
        <div className="min-w-0">
          <Card className="lg:sticky lg:top-6">
            <CardHeader title={t("assignment.info")} />
            <div className="divide-y divide-line">
              {a.allowsubmissionsfromdate > 0 && (
                <InfoRow icon={CalendarClock} label={t("assignment.allowFrom")}>
                  {formatDateTime(a.allowsubmissionsfromdate, locale)}
                </InfoRow>
              )}
              <InfoRow icon={CalendarClock} label={t("assignment.due")}>
                {a.duedate > 0 ? formatDateTime(a.duedate, locale) : t("assignment.noDue")}
              </InfoRow>
              {extension > 0 && (
                <InfoRow icon={CalendarClock} label={t("assignment.extensionUntil")}>
                  {formatDateTime(extension, locale)}
                </InfoRow>
              )}
              {cutoff > 0 && (
                <InfoRow icon={CalendarX} label={t("assignment.cutoff")}>
                  {formatDateTime(cutoff, locale)}
                </InfoRow>
              )}
              {remaining && (
                <InfoRow icon={Clock} label={t("assignment.timeRemaining")} tone={remaining.tone}>
                  {remaining.text}
                </InfoRow>
              )}
              {timelimit > 0 && (
                <InfoRow icon={Timer} label={t("assignment.timeLimit")}>
                  {formatDuration(timelimit, t)}
                </InfoRow>
              )}
              {acceptsSubmissions && (
                <InfoRow icon={Send} label={t("assignment.gradingStatus")}>
                  {graded ? t("assignment.status.graded") : t("assignment.status.notGraded")}
                </InfoRow>
              )}
              {!!a.maxattempts && a.maxattempts > 0 && (
                <InfoRow icon={Pencil} label={t("assignment.attempts")}>
                  {t("assignment.attemptsValue", {
                    n: (sub?.attemptnumber ?? 0) + 1,
                    max: a.maxattempts,
                  })}
                </InfoRow>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
