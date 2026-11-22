"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useT } from "@/i18n/I18nProvider";
import { BackLink, Card, EmptyState, QueryState, Tabs, tabPanelProps, type TabItem } from "@/components/ui";
import { moodleClient, useMoodle } from "@/lib/client-api";
import { courseStyle } from "@/lib/course-color";
import { accountRole, hasRichContent, isStaffRole } from "@/lib/format";
import { buildOutline, completionSummary, flattenOutline, forCoursePage } from "@/lib/moodle/course-outline";
import {
  useCourseDeadlines,
  useCourseDetails,
  useGradesOverview,
  useNewsFeed,
  useRecentItems,
} from "@/lib/moodle/hooks";
import { CourseHero } from "./CourseHero";
import { CourseNotFound } from "./CourseNotFound";
import { CourseDatesCard, GradeCard, SectionsCard, TeachersCard, UpcomingCard } from "./CourseRail";
import { CourseSummary } from "./CourseSummary";
import { CourseTimeline, TimelineSkeleton, type OutlineContext } from "./CourseTimeline";
import { GradesPanel } from "./GradesPanel";
import { MembersPanel } from "./MembersPanel";
import { NewsPanel } from "./NewsPanel";
import { scrollToSection, useCourseContents, useExpansion, useHashSection } from "./hooks";
import {
  findResumeTarget,
  isShownSection,
  overdueCmids,
  sectionOfModule,
  sectionProgress,
  topLevelIds,
  upcomingDates,
  type UserCourse,
} from "./lib";
import { useNow } from "@/lib/browser-hooks";

type TabKey = "content" | "news" | "grades" | "members";

/** Cheap probe: can the user list participants, and is anyone visible (separate groups)? */
const MEMBER_PROBE = [
  { name: "userfields", value: "id" },
  { name: "limitnumber", value: "1" },
];

/** Course detail screen: hero, tabs (content, announcements, grades, members) and a side rail. */
export function CourseDetail({ courseid }: { courseid: number }) {
  const t = useT();
  const { user } = useSession();
  const now = useNow();
  const [tab, setTab] = useState<TabKey>("content");
  const expansion = useExpansion();

  // Log the course view like the Moodle app does: keeps "recent courses", last
  // access and "view course" completion criteria accurate.
  useEffect(() => {
    moodleClient("core_course_view_course", { courseid }).catch(() => {});
  }, [courseid]);

  const details = useCourseDetails([courseid]);
  const course = details.byId.get(courseid);
  const contents = useCourseContents(courseid);
  const recent = useRecentItems(10);
  const news = useNewsFeed([courseid], { perForum: 10, limit: 10 });
  const deadlines = useCourseDeadlines(courseid);
  const grades = useGradesOverview();
  // Students may lack moodle/course:viewparticipants: the tab is then hidden.
  const memberProbe = useMoodle<{ id: number }[]>(
    "core_enrol_get_enrolled_users",
    { courseid, options: MEMBER_PROBE },
    false,
    { cacheMs: 5 * 60_000 }
  );
  const userCourses = useMoodle<UserCourse[]>("core_enrol_get_users_courses", { userid: user.id }, false, {
    cacheMs: 5 * 60_000,
  });

  // Students do not see "stealth" activities on Moodle's course page either.
  const staff = isStaffRole(accountRole(user));
  const outline = useMemo(
    () =>
      contents.sections ? buildOutline(forCoursePage(contents.sections, staff)).filter(isShownSection) : null,
    [contents.sections, staff]
  );
  const mods = useMemo(() => (outline ? flattenOutline(outline) : []), [outline]);
  const contentsFailed = !!contents.error;
  const progress = outline ? completionSummary(mods) : null;
  const recentCmids = recent.items.filter((i) => i.courseid === courseid).map((i) => i.cmid);
  const resume = outline && !recent.loading ? findResumeTarget(mods, recentCmids, now) : null;
  const currentSectionId =
    outline && resume && resume.kind !== "review" ? sectionOfModule(outline, resume.mod.id) : null;

  // A section link (#sec-{id} from the portal, #section-{n} from Moodle) opens
  // the content tab at that section.
  const hash = useHashSection(contents.sections);
  const hashSection = hash?.id ?? null;
  const [seenHash, setSeenHash] = useState(hash?.key ?? null);
  if ((hash?.key ?? null) !== seenHash) {
    setSeenHash(hash?.key ?? null);
    if (hash) {
      setTab("content");
      const top = outline && hash.id !== null ? topLevelIds(outline).get(hash.id) : undefined;
      if (top !== undefined) expansion.setOpen(top, true);
    }
  }

  // Sections open by default, fixed once the timeline first renders: the
  // "current" section moves when an activity is ticked off, and re-deriving
  // this would collapse the section (and the focused toggle) under the user.
  const [defaultOpenIds, setDefaultOpenIds] = useState<Set<number> | null>(null);
  if (outline && !recent.loading && defaultOpenIds === null) {
    const ids = new Set<number>();
    const primary = currentSectionId ?? outline.find((s) => s.modules.length > 0)?.id;
    if (primary !== undefined) ids.add(primary);
    const top = hashSection !== null ? topLevelIds(outline).get(hashSection) : undefined;
    if (top !== undefined) ids.add(top);
    setDefaultOpenIds(ids);
  }

  const showGrades = course?.showgrades !== 0;
  const showMembers = !memberProbe.error && !!memberProbe.data?.length;
  const tabs: TabItem<TabKey>[] = [
    { key: "content", label: t("course.tabs.content") },
    { key: "news", label: t("course.tabs.news") },
  ];
  if (showGrades) tabs.push({ key: "grades", label: t("course.tabs.grades") });
  if (showMembers) tabs.push({ key: "members", label: t("course.tabs.members") });
  const active: TabKey = tabs.some((i) => i.key === tab) ? tab : "content";

  // Scroll to the hash section once the timeline is actually on screen (it
  // waits for the recent items too), once per hash.
  const timelineShown = active === "content" && !!outline && defaultOpenIds !== null;
  const scrolledFor = useRef<string | null>(null);
  const hashTarget = hash && hashSection !== null ? `${hash.key}:${hashSection}` : null;
  useEffect(() => {
    if (!timelineShown || hashTarget === null || hashSection === null || scrolledFor.current === hashTarget) return;
    scrolledFor.current = hashTarget;
    scrollToSection(hashSection);
  }, [timelineShown, hashTarget, hashSection]);

  const jumpToSection = (id: number) => {
    setTab("content");
    expansion.setOpen(id, true);
    requestAnimationFrame(() => scrollToSection(id, { focus: true }));
  };
  // The rail sits below the panel on small screens: bring the tab bar into view.
  const openGrades = () => {
    setTab("grades");
    requestAnimationFrame(() => document.getElementById("course-tabs")?.scrollIntoView({ block: "start" }));
  };

  // Inaccessible or unknown course: Moodle returns no course and refuses the contents.
  if (!details.loading && !details.error && !course && contentsFailed) return <CourseNotFound />;

  const ctx: OutlineContext = {
    courseId: courseid,
    now,
    resumeId: resume?.mod.id ?? null,
    overdue: overdueCmids(deadlines.events, now),
    isOpen: expansion.isOpen,
    setOpen: expansion.setOpen,
    onToggleCompletion: contents.setCompletion,
  };

  const sectionItems = contentsFailed
    ? []
    : (outline?.map((s) => ({
        id: s.id,
        title: s.name || t("course.section.fallback", { n: s.section }),
        ...sectionProgress(s),
      })) ?? null);
  // Without the contents, the calendar events alone still give the dates.
  const upcoming =
    (outline || contentsFailed) && !deadlines.loading
      ? upcomingDates(mods, deadlines.events, { now, courseId: courseid })
      : null;
  // Missing from the overview when the user is not graded here (e.g. a teacher).
  const courseGrade = grades.byCourse.get(courseid);
  const memberCount = userCourses.data?.find((c) => c.id === courseid)?.enrolledusercount ?? null;

  return (
    <div className="animate-fade-in-up" style={courseStyle(courseid)}>
      <BackLink href="/courses" className="mb-2">
        {t("courses.backToCourses")}
      </BackLink>

      <CourseHero
        courseid={courseid}
        course={course}
        loading={details.loading}
        progress={progress}
        progressUnavailable={contentsFailed}
        counts={outline ? { sections: outline.length, activities: mods.filter((m) => m.modname !== "label").length } : null}
        members={memberCount}
        resume={resume}
      />

      <div id="course-tabs" className="mt-6 scroll-mt-24">
        <Tabs id="course" aria-label={t("course.tabs.label")} items={tabs} value={active} onChange={setTab} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div
          {...tabPanelProps("course", active)}
          className="min-w-0 rounded-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {active === "content" && (
            <>
              {hasRichContent(course?.summary) && <CourseSummary html={course.summary} />}
              {/* Waits for the recent items too, so the "current" section does not jump once they arrive. */}
              <QueryState
                loading={contents.loading || recent.loading}
                error={contents.error}
                skeleton={<TimelineSkeleton />}
              >
                {outline && outline.length > 0 ? (
                  <CourseTimeline
                    outline={outline}
                    currentSectionId={currentSectionId}
                    defaultOpenIds={defaultOpenIds ?? new Set()}
                    ctx={ctx}
                    onSetAll={expansion.setAll}
                  />
                ) : (
                  <Card>
                    <EmptyState icon={Inbox} title={t("courses.noVisibleContent")} />
                  </Card>
                )}
              </QueryState>
            </>
          )}
          {active === "news" && <NewsPanel items={news.items} loading={news.loading} error={news.error} />}
          {active === "grades" && <GradesPanel courseid={courseid} courseName={course?.fullname ?? ""} />}
          {active === "members" && <MembersPanel courseid={courseid} selfId={user.id} />}
        </div>

        <aside aria-label={t("course.rail.label")} className="grid content-start gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <SectionsCard sections={sectionItems} onJump={jumpToSection} />
          <UpcomingCard items={upcoming} now={now} />
          {showGrades && (grades.loading || courseGrade) && (
            <GradeCard grade={courseGrade} loading={grades.loading} onOpen={openGrades} />
          )}
          <CourseDatesCard start={course?.startdate} end={course?.enddate} now={now} />
          <TeachersCard contacts={course?.contacts ?? []} selfId={user.id} />
        </aside>
      </div>
    </div>
  );
}
