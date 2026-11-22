"use client";
import { useEffect, useRef, useState } from "react";
import { App } from "antd";
import { FileQuestion } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { BackLink, Card, IconTile, QueryState, Skeleton } from "@/components/ui";
import { moodleClient, useMoodle } from "@/lib/client-api";
import { courseStyle } from "@/lib/course-color";
import { useSiteFunctions } from "@/lib/moodle/hooks";
import type {
  Assignment,
  AssignmentsResult,
  CourseModuleInfo,
  MoodleWarning,
  SubmissionStatus,
} from "@/lib/moodle/types";
import { AssignmentHero } from "./AssignmentHero";
import { DetailsCard } from "./DetailsCard";
import { FeedbackCard, PreviousAttempts } from "./FeedbackPanel";
import { InstructionsCard } from "./InstructionsCard";
import { SubmissionCard, type BusyAction } from "./SubmissionCard";
import { SubmissionEditor } from "./SubmissionEditor";
import { SubmitCard } from "./SubmitCard";
import { TimerBar } from "./TimerBar";
import { statementText, warningMessages } from "./lib";
import { deriveState, isTimedRunning } from "./state";
import { useNow } from "@/lib/browser-hooks";

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-56 w-full" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}

function CourseBackLink({ courseId, courseName }: { courseId?: number; courseName?: string }) {
  const t = useT();
  return (
    <BackLink href={courseId ? `/courses/${courseId}` : "/courses"} className="mb-2">
      {courseName || t("activity.backToCourse")}
    </BackLink>
  );
}

/** Native student view of an assignment: instructions, own submission, grade and feedback. */
export function AssignmentView({ cmid }: { cmid: number }) {
  const t = useT();
  const cmQ = useMoodle<CourseModuleInfo>("core_course_get_course_module", { cmid }, !cmid);
  const cm = cmQ.data?.cm;
  const isAssign = cm?.modname === "assign";

  const listQ = useMoodle<AssignmentsResult>("mod_assign_get_assignments", { courseids: [cm?.course] }, !isAssign);
  const statusQ = useMoodle<SubmissionStatus>(
    "mod_assign_get_submission_status",
    { assignid: cm?.instance },
    !isAssign
  );

  const assignId = isAssign ? cm?.instance : undefined;
  useEffect(() => {
    if (!assignId) return;
    // View logging (drives completion-on-view and "recently accessed"); failures don't matter.
    moodleClient("mod_assign_view_assign", { assignid: assignId }).catch(() => {});
    moodleClient("mod_assign_view_submission_status", { assignid: assignId }).catch(() => {});
  }, [assignId]);

  const course: AssignmentsResult["courses"][number] | undefined = listQ.data?.courses.find((c) => c.id === cm?.course);
  const assignment = course?.assignments.find((a) => a.id === cm?.instance);
  const loading = cmQ.loading || listQ.loading || (!!cm && isAssign && !listQ.data && !listQ.error);

  return (
    <QueryState loading={loading} error={cmQ.error ?? listQ.error} skeleton={<PageSkeleton />}>
      {!assignment ? (
        <>
          <CourseBackLink courseId={cm?.course} />
          <Card className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <IconTile icon={FileQuestion} tone="primary" size="lg" />
            <h1 className="text-lg font-bold text-fg">{t("assignment.notFound")}</h1>
            <p className="max-w-sm text-[13px] text-subtle">{t("assignment.notFoundHint")}</p>
          </Card>
        </>
      ) : (
        <AssignmentDetail
          assignment={assignment}
          courseName={course?.fullname}
          courseShortname={course?.shortname}
          status={statusQ.data}
          statusLoading={statusQ.loading}
          statusError={statusQ.error}
          reload={statusQ.reload}
        />
      )}
    </QueryState>
  );
}

function AssignmentDetail({
  assignment: a,
  courseName,
  courseShortname,
  status,
  statusLoading,
  statusError,
  reload,
}: {
  assignment: Assignment;
  courseName?: string;
  courseShortname?: string;
  status: SubmissionStatus | null;
  statusLoading: boolean;
  statusError: string | null;
  reload: () => Promise<void>;
}) {
  const t = useT();
  const { user } = useSession();
  const { message, modal } = App.useApp();
  const site = useSiteFunctions();

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  // Set when Moodle reports the site has time limits switched off: then the
  // assignment behaves as untimed (Moodle web lets students submit normally).
  const [timeLimitOff, setTimeLimitOff] = useState(false);

  // Closing the editor unmounts the focused button: move focus to the submission card.
  const submissionHeadingRef = useRef<HTMLSpanElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing) submissionHeadingRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const now = useNow(isTimedRunning(a, status, timeLimitOff) ? 1000 : 30_000);
  const s = deriveState(a, status, now, timeLimitOff);
  const la = status?.lastattempt;
  const statement = statementText(a);
  // mod_assign_remove_submission exists from Moodle 4.5; it handles individual submissions only.
  const canRemove =
    site.has("mod_assign_remove_submission") === true &&
    !a.teamsubmission &&
    (s.subStatus === "draft" || s.subStatus === "submitted");

  // la.cansubmit is a page-load snapshot: hide the step once the cut-off passes.
  const showSubmit =
    s.acceptsSubmissions && !editing && !!a.submissiondrafts && !!la?.cansubmit && !s.closed && !s.locked;

  const afterAction = async () => {
    setEditing(false);
    setSubmitErrors([]);
    setAccepted(false);
    await reload();
  };

  const start = async () => {
    setBusy("start");
    try {
      const res = await moodleClient<{ submissionid: number; warnings?: MoodleWarning[] }>(
        "mod_assign_start_submission",
        { assignid: a.id }
      );
      const warnings = res?.warnings ?? [];
      const others = warnings.filter((w) => w.warningcode !== "timelimitnotenabled");
      if (others.length) {
        message.error(warningMessages(others, t, t("assignment.blocked.generic")).join(" "));
        await reload();
        return;
      }
      if (warnings.length) {
        // Only "timelimitnotenabled": no timer on this site, so just open the editor.
        setTimeLimitOff(true);
        message.info(t("assignment.timed.notEnabled"));
      } else {
        await reload();
      }
      setEditing(true);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const submitForGrading = async () => {
    setSubmitErrors([]);
    if (statement && !accepted) {
      setSubmitErrors([t("assignment.statement.required")]);
      return;
    }
    setBusy("submit");
    try {
      const warnings = await moodleClient<MoodleWarning[]>("mod_assign_submit_for_grading", {
        assignmentid: a.id,
        // Moodle checks the flag whenever the setting is on, even when the site
        // statement is empty and no checkbox is shown (as in Moodle's own form).
        acceptsubmissionstatement: !!a.requiresubmissionstatement && (accepted || !statement),
      });
      const msgs = warningMessages(warnings, t, t("assignment.submit.failed"));
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
      content: s.timelimit
        ? `${t("assignment.remove.confirmBody")} ${t("assignment.remove.timeLimitNote")}`
        : t("assignment.remove.confirmBody"),
      okText: t("assignment.remove.action"),
      okButtonProps: { danger: true },
      cancelText: t("assignment.editor.cancel"),
      onOk: async () => {
        setBusy("remove");
        try {
          const res = await moodleClient<{ status: boolean; warnings?: MoodleWarning[] }>("mod_assign_remove_submission", {
            userid: user.id,
            assignid: a.id,
          });
          const msgs = warningMessages(res?.warnings, t, t("assignment.remove.failed"));
          if (msgs.length || !res?.status) {
            message.error(msgs.join(" ") || t("assignment.remove.failed"));
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

  return (
    <div style={courseStyle(a.course)}>
      <CourseBackLink courseId={a.course} courseName={courseName} />
      <AssignmentHero
        assignment={a}
        courseShortname={courseShortname}
        state={s}
        status={status}
        statusLoading={statusLoading}
        now={now}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {s.timeLeft !== null && <TimerBar state={s} timeLeft={s.timeLeft} />}

          <InstructionsCard assignment={a} status={status} />

          {/* Submission status also carries the feedback: show its error whatever the assignment type. */}
          <QueryState loading={statusLoading && !status} error={statusError}>
            {s.acceptsSubmissions &&
              (editing ? (
                <SubmissionEditor
                  assignment={a}
                  settings={s.settings}
                  onSaved={afterAction}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <SubmissionCard
                  headingRef={submissionHeadingRef}
                  assignment={a}
                  state={s}
                  hasAttemptInfo={!!la}
                  canRemove={canRemove}
                  busy={busy}
                  onEdit={() => setEditing(true)}
                  onStart={start}
                  onRemove={remove}
                />
              ))}

            {showSubmit && (
              <SubmitCard
                statement={statement}
                accepted={accepted}
                onAcceptedChange={setAccepted}
                errors={submitErrors}
                busy={busy}
                onSubmit={submitForGrading}
              />
            )}
          </QueryState>

          <FeedbackCard feedback={status?.feedback} />
          {status?.previousattempts && <PreviousAttempts attempts={status.previousattempts} assignment={a} />}
        </div>

        <aside className="min-w-0">
          <DetailsCard assignment={a} state={s} now={now} />
        </aside>
      </div>
    </div>
  );
}
