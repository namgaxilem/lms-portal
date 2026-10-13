"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Drawer } from "antd";
import { ArrowLeft, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { moodleClient, useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge, Button, Card, QueryState, Skeleton } from "@/components/ui";
import { MOODLE_BASE } from "@/lib/public-config";
import type {
  AssignGradesResult,
  AssignParticipant,
  AssignmentsResult,
  CourseModuleInfo,
  SubmissionStatus,
} from "@/lib/moodle/types";
import { AssignmentInfo } from "./AssignmentInfo";
import { GradeForm } from "./GradeForm";
import { ParticipantList, statusBadge, type ParticipantRow } from "./ParticipantList";
import { SubmissionView } from "./SubmissionView";
import {
  currentSubmission,
  fetchGradingMeta,
  formatGrade,
  latestGrades,
  matchesFilter,
  participantName,
  useKeyedFetch,
  type ParticipantFilter,
} from "./lib";

/** Lowercase, accent-free text for Vietnamese-friendly search. */
const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/gi, "d").toLowerCase();

const FILTERS: ParticipantFilter[] = ["all", "needsGrading", "submitted", "notSubmitted"];

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
  const router = useRouter();
  const { user } = useSession();
  const { modal } = App.useApp();

  const cmQ = useMoodle<CourseModuleInfo>("core_course_get_course_module", { cmid });
  const courseid = cmQ.data?.cm.course;
  const assignid = cmQ.data?.cm.instance;
  const assignmentsQ = useMoodle<AssignmentsResult>(
    "mod_assign_get_assignments",
    { courseids: [courseid] },
    !courseid
  );
  const assignment = assignmentsQ.data?.courses
    .flatMap((c) => c.assignments)
    .find((a) => a.id === assignid);
  const participantsQ = useMoodle<AssignParticipant[]>(
    "mod_assign_list_participants",
    { assignid, groupid: 0, filter: "", includeenrolments: false },
    !assignid
  );
  const gradesQ = useMoodle<AssignGradesResult>(
    "mod_assign_get_grades",
    { assignmentids: [assignid] },
    !assignid
  );
  const metaQ = useKeyedFetch(`meta:${cmid}`, () => fetchGradingMeta(cmid));
  const meta = metaQ.data;

  // Log the grading table view once per assignment (fire and forget).
  useEffect(() => {
    if (assignid) moodleClient("mod_assign_view_grading_table", { assignid }).catch(() => {});
  }, [assignid]);

  const [patches, setPatches] = useState<Record<number, Partial<AssignParticipant>>>({});
  const [filter, setFilter] = useState<ParticipantFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | undefined>(initialUser);
  const [drawer, setDrawer] = useState(false);
  const dirtyRef = useRef(false);

  const allRows = useMemo<ParticipantRow[]>(() => {
    if (!participantsQ.data || !assignment) return [];
    const grades = latestGrades(gradesQ.data, assignment.id);
    return participantsQ.data.map((p) => ({
      ...p,
      ...patches[p.id],
      gradeLabel: formatGrade(grades.get(p.id)?.grade, assignment, meta?.scale),
    }));
  }, [participantsQ.data, gradesQ.data, patches, assignment, meta?.scale]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((f) => [f, allRows.filter((r) => matchesFilter(r, f)).length])
      ) as Record<ParticipantFilter, number>,
    [allRows]
  );

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return allRows.filter(
      (r) => matchesFilter(r, filter) && (!q || fold(participantName(r, t)).includes(q))
    );
  }, [allRows, filter, query, t]);

  // Default to the first participant needing grading (from the full list, so
  // changing tabs never swaps the student under an unsaved form).
  const selectedId =
    selected ?? (allRows.find((r) => r.requiregrading) ?? allRows[0])?.id;
  const selectedRow = allRows.find((r) => r.id === selectedId);
  const idx = rows.findIndex((r) => r.id === selectedId);
  const nextRow = idx >= 0 ? rows[idx + 1] : rows.find((r) => r.id !== selectedId);
  const prevRow = idx > 0 ? rows[idx - 1] : undefined;

  const statusQ = useKeyedFetch(
    assignid && selectedId ? `status:${assignid}:${selectedId}` : null,
    () =>
      moodleClient<SubmissionStatus>("mod_assign_get_submission_status", {
        assignid,
        userid: selectedId,
      })
  );
  // Rubric / guide fillings are per student; simple grading needs nothing extra.
  const userMetaQ = useKeyedFetch(
    meta && meta.method !== "simple" && selectedId ? `meta:${cmid}:${selectedId}` : null,
    () => fetchGradingMeta(cmid, selectedId)
  );
  const formMeta = meta?.method === "simple" ? meta : userMetaQ.data;

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
    setDrawer(false);
    router.replace(`/teacher/grading/${cmid}?user=${id}${courseid ? `&course=${courseid}` : ""}`, {
      scroll: false,
    });
  };

  const select = (id: number) => {
    if (id === selectedId) return setDrawer(false);
    if (!dirtyRef.current) return go(id);
    modal.confirm({
      title: t("grading.unsavedTitle"),
      content: t("grading.unsavedBody"),
      okText: t("grading.discard"),
      cancelText: t("grading.keepEditing"),
      okButtonProps: { danger: true },
      onOk: () => go(id),
    });
  };

  const team = !!assignment?.teamsubmission;

  const refreshParticipant = async (userid: number) => {
    if (!assignid) return;
    if (team) {
      // applytoall updated every group member's row.
      await participantsQ.reload();
      return;
    }
    const p = await moodleClient<Partial<AssignParticipant>>("mod_assign_get_participant", {
      assignid,
      participantid: userid,
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

  const onSaved = async (next: boolean) => {
    const userid = selectedId!;
    const target = next ? nextRow?.id : undefined;
    const refresh = [gradesQ.reload(), refreshParticipant(userid).catch(() => {})];
    if (!target) refresh.push(statusQ.reload(), userMetaQ.reload());
    await Promise.all(refresh);
    if (target) go(target);
  };

  const backHref = `/teacher/grading${courseid ?? courseHint ? `?course=${courseid ?? courseHint}` : ""}`;
  const loadingAll = cmQ.loading || assignmentsQ.loading || (!!assignid && participantsQ.loading && !participantsQ.data);
  const error =
    cmQ.error ??
    assignmentsQ.error ??
    participantsQ.error ??
    metaQ.error ??
    (assignmentsQ.data && !assignment ? t("grading.notFound") : null);

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
    />
  );

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" href={backHref} className="-ml-2">
        <ArrowLeft size={16} strokeWidth={1.75} />
        {t("grading.backToList")}
      </Button>

      <QueryState
        loading={loadingAll}
        error={error}
        skeleton={
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-4">
              <Skeleton className="hidden h-[60vh] w-80 lg:block" />
              <Skeleton className="h-[60vh] flex-1" />
            </div>
          </div>
        }
      >
        {assignment && (
          <>
            <AssignmentInfo
              assignment={assignment}
              meta={meta}
              counts={counts}
              adminLink={
                user.isSiteAdmin && MOODLE_BASE
                  ? `${MOODLE_BASE}/mod/assign/view.php?id=${cmid}&action=grading`
                  : undefined
              }
            />

            <div className="flex items-start gap-4">
              <aside className="sticky top-4 hidden h-[calc(100dvh-8rem)] min-h-[420px] w-80 shrink-0 overflow-hidden rounded-xl border border-line bg-surface lg:block">
                {list}
              </aside>

              <div className="min-w-0 flex-1 space-y-4">
                <Card className="flex items-center gap-3 px-4 py-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setDrawer(true)}
                  >
                    <Users size={16} strokeWidth={1.75} />
                    <span className="tabular-nums">{allRows.length}</span>
                  </Button>
                  {selectedRow ? (
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <UserAvatar
                        id={selectedRow.id}
                        name={participantName(selectedRow, t)}
                        src={selectedRow.profileimageurl}
                        size={36}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fg">
                          {participantName(selectedRow, t)}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <Badge tone={statusBadge(selectedRow).tone} className="h-5 px-1.5 text-[11px]">
                            {t(statusBadge(selectedRow).key)}
                          </Badge>
                          {selectedRow.grantedextension && (
                            <Badge tone="primary" className="h-5 px-1.5 text-[11px]">
                              {t("grading.extensionGranted")}
                            </Badge>
                          )}
                          {selectedRow.groupname && (
                            <span className="text-xs text-subtle">{selectedRow.groupname}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="flex-1 text-sm text-subtle">{t("grading.noParticipants")}</p>
                  )}
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={!prevRow}
                      onClick={() => prevRow && select(prevRow.id)}
                      aria-label={t("grading.previous")}
                    >
                      <ChevronLeft size={16} strokeWidth={1.75} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={!nextRow}
                      onClick={() => nextRow && select(nextRow.id)}
                      aria-label={t("grading.next")}
                    >
                      <ChevronRight size={16} strokeWidth={1.75} />
                    </Button>
                  </div>
                </Card>

                {selectedId !== undefined && (
                  <QueryState
                    loading={statusQ.loading || metaQ.loading || userMetaQ.loading}
                    error={statusQ.error ?? userMetaQ.error}
                  >
                    {statusQ.data && formMeta && (
                      <div
                        className={
                          meta?.method === "rubric"
                            ? "space-y-4"
                            : "space-y-4 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_400px] 2xl:items-start 2xl:gap-4 2xl:space-y-0"
                        }
                      >
                        <SubmissionView
                          status={statusQ.data}
                          submission={currentSubmission(statusQ.data, team)}
                          duedate={assignment.duedate}
                          gradeType={assignment.grade}
                          scale={meta?.scale}
                          groupName={selectedRow?.groupname}
                        />
                        <div className="2xl:sticky 2xl:top-4">
                          <GradeForm
                            key={selectedId}
                            assignment={assignment}
                            meta={formMeta}
                            userid={selectedId}
                            status={statusQ.data}
                            team={team}
                            hasNext={!!nextRow}
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
