"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Drawer } from "antd";
import { moodleClient, useMoodle } from "@/lib/client-api";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { BackLink, QueryState, Skeleton } from "@/components/ui";
import { currentSubmission, rawGrade } from "@/components/assignment/lib";
import { moodleBase } from "@/lib/public-config";
import type {
  AssignGradesResult,
  AssignParticipant,
  AssignmentsResult,
  CourseModuleInfo,
  SubmissionStatus,
} from "@/lib/moodle/types";
import { foldSearch } from "@/lib/format";
import { useKeyedAsync } from "@/lib/moodle/hooks";
import { AssignmentInfo } from "./AssignmentInfo";
import { GradeForm, type SavedResult } from "./GradeForm";
import { ParticipantList, type ParticipantRow } from "./ParticipantList";
import { StudentHeader } from "./StudentHeader";
import { SubmissionView } from "./SubmissionView";
import { useActivityGroups } from "./useActivityGroups";
import {
  FILTERS,
  fetchGradingFillings,
  fetchGradingSetup,
  formatGrade,
  gradeLockedInGradebook,
  latestGrades,
  matchesFilter,
  participantName,
  rememberMethodBlocked,
  wasMethodBlocked,
  type ParticipantFilter,
} from "./lib";
import type { GradingFillingsResult, SaveOutcome } from "./types";

function WorkspaceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 w-full" />
      <div className="flex gap-4">
        <Skeleton className="hidden h-[60vh] w-80 lg:block" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-[50vh] w-full" />
        </div>
      </div>
    </div>
  );
}

export function GradingWorkspace({
  cmid,
  initialUser,
  courseHint,
}: {
  cmid: number;
  initialUser?: number;
  courseHint?: number;
}) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const { user } = useSession();
  const { modal } = App.useApp();

  /* ---- Assignment ---- */
  const cmQ = useMoodle<CourseModuleInfo>("core_course_get_course_module", { cmid });
  const cm = cmQ.data?.cm;
  const courseid = cm?.course;
  // Editing teachers / managers: proxy for the release / review capabilities (see workflowOptions).
  const canRelease = cm?.added !== undefined;
  const assignid = cm?.modname === "assign" ? cm.instance : undefined;
  // includenotenrolledcourses: admins / managers can grade without being enrolled.
  const assignmentsQ = useMoodle<AssignmentsResult>(
    "mod_assign_get_assignments",
    { courseids: [courseid], includenotenrolledcourses: true },
    !assignid
  );
  const course = assignmentsQ.data?.courses.find((c) => c.id === courseid);
  const assignment = course?.assignments.find((a) => a.id === assignid);
  const team = !!assignment?.teamsubmission;

  /* ---- Groups, participants, grades, grading setup ---- */
  const groups = useActivityGroups(cmid);
  const [group, setGroup] = useState<number | null>(null);
  const groupid = group ?? (groups && !groups.canSeeAll ? (groups.groups[0]?.id ?? 0) : 0);
  const participantsQ = useMoodle<AssignParticipant[]>(
    "mod_assign_list_participants",
    { assignid, groupid, filter: "", includeenrolments: false },
    !assignid || !groups
  );
  const gradesQ = useMoodle<AssignGradesResult>("mod_assign_get_grades", { assignmentids: [assignid] }, !assignid);
  const [freshGrades, setFreshGrades] = useState<AssignGradesResult | null>(null);
  const gradesData = freshGrades ?? gradesQ.data;
  const grades = useMemo(() => latestGrades(gradesData, assignid ?? 0), [gradesData, assignid]);

  // A failed setup blocks the form: it only fails when the caller's own Moodle calls fail (403 / 404 / 502).
  const setupQ = useKeyedAsync(`setup:${cmid}`, () => fetchGradingSetup(cmid));
  const setup = setupQ.data;
  // Moodle ignored a plain grade: the assignment most likely uses advanced grading, and further
  // saves would reset other students' grades. Remembered in this browser while the method is unknown.
  const [blockedNow, setBlockedNow] = useState(false);
  const blockedBefore = useMemo(() => setup?.method === "unknown" && wasMethodBlocked(cmid), [setup?.method, cmid]);
  const methodBlocked = blockedNow || blockedBefore;
  // Students whose grade Moodle kept because it is locked / overridden in the gradebook.
  const [lockedUsers, setLockedUsers] = useState<ReadonlySet<number>>(() => new Set());

  // Log the grading table view once per assignment (fire and forget).
  useEffect(() => {
    if (assignid) moodleClient("mod_assign_view_grading_table", { assignid }).catch(() => {});
  }, [assignid]);

  /* ---- Participant list ---- */
  const [patches, setPatches] = useState<Record<number, Partial<AssignParticipant>>>({});
  const [filter, setFilter] = useState<ParticipantFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | undefined>(initialUser);
  const [visit, setVisit] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const dirtyRef = useRef(false);

  const scale = setup?.scale;
  const allRows = useMemo<ParticipantRow[]>(() => {
    if (!participantsQ.data || !assignment) return [];
    return participantsQ.data.map((p) => ({
      ...p,
      ...patches[p.id],
      gradeLabel: formatGrade(grades.get(p.id)?.grade, assignment, scale, locale),
    }));
  }, [participantsQ.data, grades, patches, assignment, scale, locale]);

  const counts = useMemo(
    () =>
      Object.fromEntries(FILTERS.map((f) => [f, allRows.filter((r) => matchesFilter(r, f)).length])) as Record<
        ParticipantFilter,
        number
      >,
    [allRows]
  );

  const rows = useMemo(() => {
    const q = foldSearch(query);
    return allRows.filter((r) => matchesFilter(r, filter) && (!q || foldSearch(participantName(r, t)).includes(q)));
  }, [allRows, filter, query, t]);

  // ?user= (e.g. from a notification) only counts when that student is in the list;
  // otherwise start at the first participant needing grading. Uses the full list, so
  // changing tabs never swaps the student under an unsaved form.
  const selectedId =
    selected !== undefined && allRows.some((r) => r.id === selected)
      ? selected
      : (allRows.find((r) => r.requiregrading) ?? allRows[0])?.id;
  const selectedRow = allRows.find((r) => r.id === selectedId);
  const selectedGrade = selectedId !== undefined ? grades.get(selectedId) : undefined;
  const idx = rows.findIndex((r) => r.id === selectedId);
  const nextRow = idx >= 0 ? rows[idx + 1] : rows.find((r) => r.id !== selectedId);
  const prevRow = idx > 0 ? rows[idx - 1] : undefined;

  /* ---- Selected student ---- */
  // Unfiltered: GradeForm saves untouched feedback back exactly as Moodle stores it.
  const statusQ = useKeyedAsync(assignid && selectedId ? `status:${assignid}:${selectedId}` : null, () =>
    moodleClient<SubmissionStatus>("mod_assign_get_submission_status", { assignid, userid: selectedId }, { filter: false })
  );
  // Rubric / guide fillings, read once per visit of a student (the form holds them after a save).
  const advanced = !!(setup?.rubric || setup?.guide);
  const fillingsQ = useKeyedAsync<GradingFillingsResult>(
    advanced && selectedId !== undefined && gradesData ? `fillings:${selectedId}:${visit}` : null,
    () => (selectedGrade ? fetchGradingFillings(cmid, selectedGrade.id) : Promise.resolve({ fillings: [] }))
  );
  const fillings: GradingFillingsResult | null = !advanced
    ? null
    : (fillingsQ.data ?? (fillingsQ.error ? { fillings: [], issue: "unavailable" } : null));

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const go = (id: number) => {
    dirtyRef.current = false;
    setSelected(id);
    setVisit((v) => v + 1);
    setDrawer(false);
    router.replace(`/teacher/grading/${cmid}?user=${id}${courseid ? `&course=${courseid}` : ""}`, { scroll: false });
  };

  /** Runs `action` now, or after confirming that unsaved changes may be dropped. */
  const confirmDiscard = (action: () => void) => {
    if (!dirtyRef.current) return action();
    modal.confirm({
      title: t("grading.unsavedTitle"),
      content: t("grading.unsavedBody"),
      okText: t("grading.discard"),
      cancelText: t("grading.keepEditing"),
      okButtonProps: { danger: true },
      onOk: () => {
        dirtyRef.current = false;
        action();
      },
    });
  };

  const select = (id: number) => (id === selectedId ? setDrawer(false) : confirmDiscard(() => go(id)));
  const changeGroup = (id: number) => confirmDiscard(() => setGroup(id));

  const refreshParticipant = async (userid: number) => {
    if (!assignid) return;
    if (team) {
      // applytoall updated every group member's row.
      await participantsQ.reload();
      return;
    }
    const p = await moodleClient<Partial<AssignParticipant>>("mod_assign_get_participant", {
      assignid,
      userid,
      embeduser: false,
    });
    setPatches((cur) => ({
      ...cur,
      [userid]: {
        submitted: p.submitted,
        requiregrading: p.requiregrading,
        grantedextension: p.grantedextension,
        submissionstatus: p.submissionstatus,
      },
    }));
  };

  /** Why Moodle kept another grade: locked / overridden in the gradebook, else (most likely) advanced grading. */
  const explainIgnoredGrade = async (userid: number): Promise<SaveOutcome> => {
    if (courseid && (await gradeLockedInGradebook(courseid, cmid, userid))) {
      setLockedUsers((cur) => new Set(cur).add(userid));
      return "locked";
    }
    setBlockedNow(true);
    if (setup?.method === "unknown") rememberMethodBlocked(cmid);
    return "blocked";
  };

  const onSaved = async ({ next, grade }: SavedResult): Promise<SaveOutcome> => {
    const userid = selectedId!;
    const target = next ? nextRow?.id : undefined;
    // Pin the student: a default selection would otherwise jump once they no longer need grading.
    setSelected(userid);
    let outcome: SaveOutcome = "applied";
    try {
      const fresh = await moodleClient<AssignGradesResult>("mod_assign_get_grades", { assignmentids: [assignid] });
      setFreshGrades(fresh);
      // Moodle skips `grade` when the gradebook grade is locked / overridden or a rubric / guide is active.
      if (grade !== null) {
        const stored = rawGrade(latestGrades(fresh, assignid!).get(userid)?.grade);
        if (stored === null || Math.abs(stored - grade) >= 0.001) outcome = await explainIgnoredGrade(userid);
      }
    } catch {
      // Labels refresh on the next page load; the grade itself was saved.
    }
    await refreshParticipant(userid).catch(() => {});
    if (outcome === "applied" && target) go(target);
    else await statusQ.reload();
    return outcome;
  };

  const backCourse = courseid ?? courseHint;
  const backHref = `/teacher/grading${backCourse ? `?course=${backCourse}` : ""}`;
  const loadingAll =
    cmQ.loading ||
    assignmentsQ.loading ||
    (!!assignid && (!groups || (participantsQ.loading && !participantsQ.data) || (gradesQ.loading && !gradesData)));
  const error =
    cmQ.error ??
    assignmentsQ.error ??
    participantsQ.error ??
    gradesQ.error ??
    ((cm && !assignid) || (assignmentsQ.data && !assignment) ? t("grading.notFound") : null);
  const bodyLoading = statusQ.loading || (!setup && !setupQ.error) || (advanced && !fillings);
  const status = statusQ.data;

  const list = (
    <ParticipantList
      rows={rows}
      counts={counts}
      filter={filter}
      onFilter={setFilter}
      query={query}
      onQuery={setQuery}
      selectedId={selectedId}
      onSelect={select}
      groups={groups}
      groupid={groupid}
      onGroup={changeGroup}
    />
  );

  return (
    <div className="space-y-4">
      <BackLink href={backHref}>{t("grading.backToList")}</BackLink>

      <QueryState loading={loadingAll} error={error} skeleton={<WorkspaceSkeleton />}>
        {assignment && (
          <>
            <AssignmentInfo
              assignment={assignment}
              courseName={course?.fullname}
              setup={setup}
              counts={counts}
              adminLink={
                user.isSiteAdmin && moodleBase()
                  ? `${moodleBase()}/mod/assign/view.php?id=${cmid}&action=grading`
                  : undefined
              }
            />

            <div className="flex items-start gap-4">
              <aside
                aria-label={t("grading.participants")}
                className="sticky top-[calc(var(--topbar-h)+1rem)] hidden h-[calc(100dvh-var(--topbar-h)-3rem)] min-h-[420px] w-80 shrink-0 overflow-hidden rounded-card border border-line/60 bg-surface shadow-card lg:block dark:border-line"
              >
                {list}
              </aside>

              <div className="min-w-0 flex-1 space-y-4">
                <StudentHeader
                  row={selectedRow}
                  total={allRows.length}
                  onOpenList={() => setDrawer(true)}
                  onPrev={prevRow ? () => select(prevRow.id) : undefined}
                  onNext={nextRow ? () => select(nextRow.id) : undefined}
                />

                {selectedId !== undefined && (
                  <QueryState
                    loading={bodyLoading}
                    error={statusQ.error ?? setupQ.error}
                    skeleton={<Skeleton className="h-[50vh] w-full" />}
                  >
                    {status && setup && (
                      <div
                        className={
                          setup.method === "rubric"
                            ? "space-y-4"
                            : "space-y-4 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_420px] 2xl:items-start 2xl:gap-4 2xl:space-y-0"
                        }
                      >
                        <SubmissionView
                          status={status}
                          submission={currentSubmission(status, assignment)}
                          duedate={assignment.duedate}
                          gradeLabelFor={(raw) => formatGrade(raw, assignment, setup.scale, locale)}
                          groupName={selectedRow?.groupname}
                        />
                        <div
                          className={
                            setup.method === "rubric"
                              ? undefined
                              : "2xl:sticky 2xl:top-[calc(var(--topbar-h)+1rem)] 2xl:max-h-[calc(100dvh-var(--topbar-h)-2rem)] 2xl:overflow-y-auto 2xl:rounded-card"
                          }
                        >
                          <GradeForm
                            key={selectedId}
                            assignment={assignment}
                            setup={setup}
                            fillings={fillings}
                            currentGrade={selectedGrade?.grade ?? status.feedback?.grade?.grade}
                            userid={selectedId}
                            status={status}
                            team={team}
                            hasNext={!!nextRow}
                            methodBlocked={methodBlocked}
                            gradeLocked={lockedUsers.has(selectedId)}
                            canRelease={canRelease}
                            feedbackHidden={
                              !!assignment.markingworkflow &&
                              status.lastattempt?.gradingstatus !== "released" &&
                              !!selectedGrade
                            }
                            onDirty={(d) => {
                              dirtyRef.current = d;
                            }}
                            onSaved={onSaved}
                          />
                        </div>
                      </div>
                    )}
                  </QueryState>
                )}
              </div>
            </div>

            <Drawer
              open={drawer}
              onClose={() => setDrawer(false)}
              placement="left"
              size={320}
              title={t("grading.participants")}
              styles={{ body: { padding: 0 } }}
              className="lg:hidden"
            >
              {list}
            </Drawer>
          </>
        )}
      </QueryState>
    </div>
  );
}
