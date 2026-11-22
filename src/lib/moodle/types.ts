/**
 * Partial Moodle Web Service response shapes. Moodle returns more fields than
 * are typed here; only the ones the portal uses are declared.
 */

export interface SiteInfo {
  sitename: string;
  username: string;
  firstname: string;
  lastname: string;
  fullname: string;
  userid: number;
  userpictureurl: string;
  lang: string;
  siteurl: string;
  userissiteadmin?: boolean;
  functions: { name: string; version: string }[];
  /** e.g. "4.1.2+ (Build: 20230414)". */
  release?: string;
  /** e.g. "2022112802.08". */
  version?: string;
}

/** Highest account role, used for display and navigation. */
export type AccountRole = "admin" | "teacher" | "student";

/** The portal's serializable, non-sensitive user record (stored in a cookie). */
export interface SessionUser {
  id: number;
  fullname: string;
  /** Moodle first name, used for greetings (absent in sessions created before it existed). */
  firstname?: string;
  username: string;
  pictureurl: string;
  sitename: string;
  isSiteAdmin: boolean;
  /** Highest role across the site (admin) or any course (teacher), else student. */
  highestRole: AccountRole;
}

/** Full user profile from core_user_get_users_by_field. */
export interface UserProfile {
  id: number;
  username: string;
  fullname: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  department?: string;
  institution?: string;
  city?: string;
  country?: string;
  profileimageurl?: string;
  firstaccess?: number;
  lastaccess?: number;
  description?: string;
  lang?: string;
  /** Student / staff code; only sent when set. */
  idnumber?: string;
  /** Only when phone numbers are identity fields on the site (or for admins). */
  phone1?: string;
  phone2?: string;
  /** Visible, non-empty custom profile fields. */
  customfields?: ProfileCustomField[];
}

/** A custom profile field of user_description (core_user_get_users_by_field). */
export interface ProfileCustomField {
  /** Field datatype: text, textarea, menu, checkbox, datetime, or a plugin type. */
  type: string;
  /** text/textarea: formatted HTML; datetime: unix seconds; checkbox: "0" | "1". */
  value: string;
  /** Unfiltered: may hold multilang spans (see pickLanguage). */
  name: string;
  shortname: string;
}

/** course_summary_exporter (timeline, recent courses). */
export interface TimelineCourse {
  id: number;
  fullname: string;
  shortname: string;
  summary: string;
  /** Never empty on 4.1: a generated data:image/svg+xml pattern when no image was uploaded. */
  courseimage?: string;
  /** Always a number on 4.1 (0 without data); only meaningful when `hasprogress`. */
  progress?: number | null;
  /** False when Moodle tracks no completion for this user here (teachers, no tracked activities). */
  hasprogress?: boolean;
  startdate?: number;
  enddate?: number;
  /** False when the course is hidden from students (only staff receive such courses). */
  visible?: boolean;
  /** Hidden by the user in Moodle's "My courses" block. */
  hidden?: boolean;
  isfavourite?: boolean;
  showshortname?: boolean;
  /** Category name (class/slot on HVTC). */
  coursecategory?: string;
  viewurl?: string;
  /** Last access (unix seconds); only returned by core_course_get_recent_courses. */
  timeaccess?: number;
}

/** block_recentlyaccesseditems_get_recent_items — newest first. */
export interface RecentItem {
  id: number;
  courseid: number;
  cmid: number;
  userid: number;
  modname: string;
  name: string;
  coursename: string;
  timeaccess: number;
  viewurl: string;
  courseviewurl: string;
}

/* ---------------- Calendar ---------------- */

/**
 * A calendar event as every calendar web service exports it (Moodle 4.1
 * calendar/classes/external/event_exporter_base.php and its event_exporter /
 * calendar_event_exporter subclasses): action events, the upcoming view and
 * the month view. Only used fields.
 */
export interface CalendarEvent {
  id: number;
  /** Event title, e.g. "Quiz 1 closes". */
  name: string;
  /** Formatted HTML (pluginfile URLs rewritten). */
  description?: string | null;
  /** FORMAT_PLAIN run through Moodle's formatter: HTML-escaped, with <br />. */
  location?: string | null;
  /** `location` as HTML, with a bare http(s) URL turned into a link. */
  formattedlocation?: string | null;
  /** "open", "close", "due", "course", "site", "user", "group", "category"… */
  eventtype: string;
  /** Activity events are "course"; others "site" | "user" | "group" | "category" | "other". */
  normalisedeventtype: string;
  timestart: number;
  /** Seconds; 0 for a point in time. */
  timeduration: number;
  timesort: number;
  /** Module name of an activity event ("quiz", "scorm"…). */
  modulename?: string | null;
  /** Course module id of an activity event (the exporter sends the cm id, not the activity instance). */
  instance?: number | null;
  /** Name of the activity the event belongs to. */
  activityname?: string | null;
  groupname?: string | null;
  /** Absent for site events (Moodle skips the site course). */
  course?: { id: number; fullname: string; shortname: string };
  /** Activity view.php for activity events, else the course (or site) page. */
  url: string;
  /** Set while the user still has something to do (action events). */
  action?: { name: string; url: string; itemcount: number; actionable: boolean };
}

/** core_calendar_get_action_events_by_timesort / _by_course. */
export interface CalendarActionEventsResult {
  events: CalendarEvent[];
  firstid?: number;
  lastid?: number;
}

/** week_day_exporter: one day of the month grid (times in the user's Moodle timezone). */
export interface CalendarDay {
  /** Midnight of the day. */
  timestamp: number;
  mday: number;
  istoday: boolean;
  isweekend: boolean;
  events: CalendarEvent[];
}

/** core_calendar_get_calendar_monthly_view (month_exporter). */
export interface CalendarMonthView {
  weeks: { prepadding: number[]; postpadding: number[]; days: CalendarDay[] }[];
  /** In week order, starting at the site's first day of the week. */
  daynames: { dayno: number }[];
}

/**
 * core_calendar_get_calendar_upcoming_view: every event the user can see from
 * the current hour, up to their calendar_lookahead and calendar_maxevents.
 */
export interface CalendarUpcomingView {
  events: CalendarEvent[];
}

/** A role as listed on an enrolled user (name is empty for standard roles). */
export interface UserRole {
  roleid?: number;
  name?: string;
  shortname: string;
}

/**
 * core_enrol_get_enrolled_users item, limited to the `userfields` option the
 * caller asks for (Moodle then skips custom fields, groups and course lists).
 */
export interface EnrolledUser {
  id: number;
  fullname: string;
  /** Only when the viewer may see it (maildisplay / identity fields). */
  email?: string;
  profileimageurl?: string;
  profileimageurlsmall?: string;
  /** Course-context roles only: roles assigned at category or site level are not listed. */
  roles?: UserRole[];
  /** 0 = never opened the course; absent when the site hides last access (hiddenuserfields). */
  lastcourseaccess?: number;
}

/** external_warnings item, returned next to the data by many functions. */
export interface MoodleWarning {
  item?: string;
  itemid?: number;
  warningcode: string;
  message: string;
}

/** A file, folder or link of a module (core_course_get_contents `contents`). */
export interface CourseModuleContent {
  /** "file", "url", "content"… */
  type: string;
  filename?: string;
  fileurl?: string;
  filesize?: number;
  mimetype?: string;
  timemodified?: number;
  /** The main file of a resource comes first (sortorder 1). */
  sortorder?: number;
}

export interface CourseModule {
  id: number;
  name: string;
  /** e.g. "scorm", "quiz", "resource", "url", "forum", "assign", "label", "page" */
  modname: string;
  modplural?: string;
  /** Id of the activity instance (scorm.id, quiz.id…). */
  instance?: number;
  /** Activity context id (Moodle 3.10+). */
  contextid?: number;
  url?: string;
  modicon?: string;
  description?: string;
  visible?: number;
  uservisible?: boolean;
  /** 0 for "stealth" modules: available, but not shown on the course page. */
  visibleoncoursepage?: number;
  /** HTML explaining access restrictions (empty when none). */
  availabilityinfo?: string;
  /** 0 none, 1 manual, 2 automatic. */
  completion?: number;
  completiondata?: CompletionData | null;
  /**
   * Activity dates (Moodle 3.11+): `dataid` is e.g. "timeopen", "timeclose",
   * "duedate", "allowsubmissionsfromdate"; `label` is already localized.
   */
  dates?: { label: string; timestamp: number; dataid?: string }[];
  contents?: CourseModuleContent[];
  /** Files of resource-like modules: count, total size, MIME types (main file first). */
  contentsinfo?: { filescount: number; filessize: number; lastmodified: number; mimetypes: string[] };
  /** JSON string of module-specific data; for "subsection" rows (4.5+) it holds {sectionid}. */
  customdata?: string;
  /** Moodle 5.0.x/5.1.1+: false for modules that must not appear on the course page (e.g. question banks). */
  candisplay?: boolean;
  /** Moodle 4.4+: activity purpose ("content", "assessment", "collaboration"…). */
  purpose?: string;
}

export interface CompletionData {
  /** 0 incomplete, 1 complete, 2 complete-pass, 3 complete-fail. */
  state: number;
  timecompleted?: number;
  overrideby?: number | null;
  valueused?: boolean;
  hascompletion?: boolean;
  isautomatic?: boolean;
  istrackeduser?: boolean;
  uservisible?: boolean;
  /** Moodle 4.4+: overall completion as Moodle counts it (also covers complete-fail for "receive a grade"). */
  isoverallcomplete?: boolean;
  /** Automatic completion rules and their state ("completionview", "completionusegrade"…); empty for manual completion. */
  details?: { rulename: string; rulevalue: { status: number; description: string } }[];
}

export interface CourseSection {
  id: number;
  name: string;
  section: number;
  summary: string;
  visible?: number;
  uservisible?: boolean;
  /** HTML explaining why the section is restricted (when the user cannot access it yet). */
  availabilityinfo?: string;
  /** Moodle 4.5+: "mod_subsection" for a delegated (sub)section, else null. */
  component?: string | null;
  /** Moodle 4.5+: instance id of the delegating module (with `component`). */
  itemid?: number | null;
  modules: CourseModule[];
}

export interface PopupNotification {
  id: number;
  subject: string;
  fullmessage: string;
  fullmessagehtml: string;
  smallmessage: string;
  contexturl: string;
  contexturlname: string;
  timecreated: number;
  read: boolean;
  useridfrom: number;
  /** e.g. "mod_assign", "mod_forum", "moodle". */
  component?: string;
  /** e.g. "assign_notification", "posts". */
  eventtype?: string;
  /** JSON string, e.g. {"cmid":5,"instance":2,"messagetype":"gradersubmissionupdated","courseid":3}. */
  customdata?: string;
  iconurl?: string;
}

export interface NotificationsResult {
  notifications: PopupNotification[];
  unreadcount: number;
}

/**
 * gradereport_user_get_grade_items item. Everything from `locked` on is
 * VALUE_OPTIONAL and gated by the user-report "show…" settings (on HVTC: no
 * range, percentage only in some courses, no feedback, no rank). `itemname` is
 * PARAM_TEXT on 4.1 and PARAM_RAW (may hold HTML and multilang spans) from 4.5.
 */
export interface GradeItem {
  id: number;
  itemname: string | null;
  /** "course" | "category" | "mod" | "manual" (+ "outcome"…). */
  itemtype: string;
  itemmodule: string | null;
  iteminstance: number;
  itemnumber: number;
  /** The grade item is locked for this user. */
  locked?: boolean;
  /** Course module id (mod items with a visible activity only). */
  cmid?: number;
  graderaw?: number | null;
  gradedatesubmitted?: number | null;
  /** grade_grades.timemodified (or overridden); null when ungraded. */
  gradedategraded?: number | null;
  gradeneedsupdate?: boolean;
  gradeishidden?: boolean;
  gradeislocked?: boolean;
  gradeisoverridden?: boolean;
  /** May start with Moodle's pass/fail icon HTML; "-" when ungraded, "Error" when it needs a regrade. */
  gradeformatted?: string;
  grademin?: number;
  grademax?: number;
  /** Localised, e.g. "85,00 %"; "-" when ungraded. */
  percentageformatted?: string;
  /** Only when the course shows ranks. */
  rank?: number;
  numusers?: number;
  /** Raw HTML (the 4.1 WS never formats it); pluginfile URLs included. */
  feedback?: string;
}

export interface UserGrades {
  usergrades: {
    courseid: number;
    userid: number;
    userfullname: string;
    gradeitems: GradeItem[];
  }[];
}

export interface Assignment {
  id: number;
  cmid: number;
  course: number;
  name: string;
  duedate: number;
  allowsubmissionsfromdate: number;
  /** >0 max points, <0 scale id, 0 not graded. */
  grade: number;
  intro: string;
  introformat?: number;
  introattachments?: MoodleFile[];
  cutoffdate?: number;
  gradingduedate?: number;
  nosubmissions?: number;
  submissiondrafts?: number;
  requiresubmissionstatement?: number;
  submissionstatement?: string;
  teamsubmission?: number;
  markingworkflow?: number;
  blindmarking?: number;
  maxattempts?: number;
  timelimit?: number;
  /** Plugin settings, e.g. {plugin:"file", subtype:"assignsubmission", name:"maxfilesubmissions", value:"3"}. */
  configs?: { plugin: string; subtype: string; name: string; value: string }[];
}

/** A file as returned by Moodle web services (fileurl is a webservice/pluginfile URL). */
export interface MoodleFile {
  filename: string;
  filepath?: string;
  filesize?: number;
  fileurl: string;
  mimetype?: string;
  timemodified?: number;
}

/** Submission / feedback plugin data (onlinetext, file, comments…). */
export interface AssignPlugin {
  type: string;
  name: string;
  fileareas?: { area: string; files?: MoodleFile[] }[];
  editorfields?: { name: string; description: string; text: string; format: number }[];
}

export interface AssignSubmission {
  id: number;
  userid: number;
  attemptnumber: number;
  timecreated: number;
  timemodified: number;
  timestarted?: number;
  /** new | draft | submitted | reopened */
  status: string;
  groupid: number;
  plugins?: AssignPlugin[];
  /** graded | notgraded */
  gradingstatus?: string;
}

/** mod_assign_get_submission_status */
export interface SubmissionStatus {
  gradingsummary?: {
    participantcount: number;
    submissiondraftscount: number;
    submissionsenabled: boolean;
    submissionssubmittedcount: number;
    submissionsneedgradingcount: number;
    warnofungroupedusers: string | boolean;
  };
  lastattempt?: {
    submission?: AssignSubmission;
    teamsubmission?: AssignSubmission;
    submissiongroup?: number;
    submissionsenabled: boolean;
    locked: boolean;
    graded: boolean;
    canedit: boolean;
    caneditowner: boolean;
    cansubmit: boolean;
    extensionduedate: number | null;
    timelimit?: number;
    blindmarking: boolean;
    gradingstatus: string;
    usergroups?: number[];
  };
  feedback?: {
    grade?: {
      id: number;
      userid: number;
      attemptnumber: number;
      grader: number;
      /** Raw grade as a string ("-1.00000" / "" = not graded). */
      grade: string;
      timemodified: number;
    };
    gradefordisplay: string;
    gradeddate: number;
    plugins?: AssignPlugin[];
  };
  previousattempts?: {
    attemptnumber: number;
    submission?: AssignSubmission;
    grade?: { grade: string; timemodified: number; gradefordisplay?: string };
    feedbackplugins?: AssignPlugin[];
  }[];
  assignmentdata?: {
    attachments?: { intro?: MoodleFile[]; activity?: MoodleFile[] };
    activity?: string;
    activityformat?: number;
  };
}

/** mod_assign_list_participants item */
export interface AssignParticipant {
  id: number;
  fullname: string;
  email?: string;
  profileimageurl?: string;
  submitted: boolean;
  requiregrading: boolean;
  grantedextension: boolean;
  /** new | draft | submitted | reopened */
  submissionstatus?: string;
  groupid?: number;
  groupname?: string;
  /** Blind marking participant number (-1 when not blind). */
  recordid?: number;
}

/** mod_assign_get_grades */
export interface AssignGradesResult {
  assignments: {
    assignmentid: number;
    grades: { id: number; userid: number; attemptnumber: number; grade: string; timemodified: number }[];
  }[];
}

export interface AssignmentsResult {
  courses: { id: number; fullname: string; shortname: string; assignments: Assignment[] }[];
}

/* ---------------- SCORM (mod_scorm web services) ---------------- */

/** A tracked data element as Moodle stores it (indexes use `_n.`, e.g. cmi.interactions_0.id). */
export interface ScormTrack {
  element: string;
  value: string | number;
}

/** One activity from mod_scorm_get_scorms_by_courses. */
export interface Scorm {
  id: number;
  coursemodule: number;
  course: number;
  name: string;
  /** "SCORM_1.2", "SCORM_1.3" (2004) or "AICC". */
  version?: string;
  revision?: number;
  /** SCO id to launch first. */
  launch?: number;
  maxattempt?: number;
  /** 0 = no, 1 = when previous attempt completed, 2 = always. */
  forcenewattempt?: number;
  lastattemptlock?: boolean;
  hidebrowse?: boolean;
  /** 3 = TOC disabled. */
  hidetoc?: number;
  /** Navigation buttons: 0 = none, 1 = under the content, 2 = floating (SCORM_NAV_*). */
  nav?: number;
  /** Continue to the next SCO automatically when one finishes. */
  auto?: boolean;
  timeopen?: number;
  timeclose?: number;
}

export interface ScormsByCoursesResult {
  scorms: Scorm[];
  /** Why an activity is not listed or not available (e.g. "expired", "notopenyet"). */
  warnings?: MoodleWarning[];
}

/** One SCO (or organization / aggregation node) from mod_scorm_get_scorm_scoes. */
export interface ScormSco {
  id: number;
  scorm: number;
  organization: string;
  /** Parent identifier: "/" for organizations, the organization or item identifier otherwise. */
  parent: string;
  identifier: string;
  /** Launch file relative to the package root. Empty for non-launchable nodes. */
  launch: string;
  /** "sco", "asset" or "" (aggregation). */
  scormtype: string;
  title: string;
  sortorder: number;
  extradata?: ScormTrack[];
}

export interface ScormScoesResult {
  scoes: ScormSco[];
}

export interface ScormUserDataResult {
  data: { scoid: number; userdata: ScormTrack[]; defaultdata: ScormTrack[] }[];
}

export interface ScormAccessInfo {
  cansavetrack?: boolean;
}

/** core_course_get_course_module. */
export interface CourseModuleInfo {
  cm: {
    id: number;
    course: number;
    instance: number;
    name: string;
    modname: string;
    /** Id of the section holding the module. */
    section: number;
    /** Only for users with moodle/course:manageactivities. */
    added?: number;
    /** Scale items when graded with a scale (manageactivities only). */
    scale?: string;
    /** With moodle/grade:managegradingforms as well. */
    advancedgrading?: { area: string; method?: string }[];
  };
}

/* ---------------- Advanced grading (rubric / marking guide) ---------------- */

export interface RubricLevel {
  id: number;
  score: number;
  definition: string;
}

export interface RubricCriterion {
  id: number;
  description: string;
  levels: RubricLevel[];
}

export interface GuideCriterion {
  id: number;
  shortname: string;
  description: string;
  /** Description shown to markers only. */
  descriptionmarkers: string;
  maxscore: number;
}

/** One saved criterion filling (rubric: levelid; marking guide: score). */
export interface GradingFilling {
  criterionid: number;
  levelid?: number;
  score?: number;
  remark?: string;
}

/* ---------------- Course details, completion, forums, grades overview ---------------- */

/** core_course_get_courses_by_field (subset). */
export interface CourseDetails {
  id: number;
  fullname: string;
  shortname: string;
  categoryid?: number;
  categoryname?: string;
  summary?: string;
  startdate?: number;
  enddate?: number;
  format?: string;
  showgrades?: number;
  enablecompletion?: number;
  /** Moodle 4.5+ only; earlier the image is among `overviewfiles`. */
  courseimage?: string;
  overviewfiles?: MoodleFile[];
  /** Course contacts (teachers by default — Site admin › Appearance › Courses): only id and name. */
  contacts?: { id: number; fullname: string }[];
}

export interface CoursesByFieldResult {
  courses: CourseDetails[];
}

/** core_completion_get_activities_completion_status item. */
export interface ActivityCompletionStatus {
  cmid: number;
  modname: string;
  instance: number;
  /** 0 incomplete, 1 complete, 2 complete-pass, 3 complete-fail. */
  state: number;
  /** Unix seconds; 0 when not completed. */
  timecompleted: number;
  /** 0 none, 1 manual, 2 automatic. */
  tracking: number;
  /** Moodle 4.4+: overall completion as Moodle counts it. */
  isoverallcomplete?: boolean;
  hascompletion?: boolean;
  isautomatic?: boolean;
  /** False when completion is not tracked for this user (e.g. teachers). */
  istrackeduser?: boolean;
  uservisible?: boolean;
}

export interface ActivitiesCompletionResult {
  statuses: ActivityCompletionStatus[];
}

/** mod_forum_get_forums_by_courses item (subset). */
export interface ForumInfo {
  id: number;
  course: number;
  /** "news" = the course announcements forum. */
  type: string;
  name: string;
  cmid: number;
}

/** mod_forum_get_forum_discussions item (subset). */
export interface ForumDiscussion {
  id: number;
  discussion: number;
  name: string;
  subject: string;
  /** HTML. */
  message: string;
  created: number;
  timemodified: number;
  userfullname: string;
  userpictureurl?: string;
  numreplies?: number;
  pinned?: boolean;
}

export interface ForumDiscussionsResult {
  discussions: ForumDiscussion[];
}

/** gradereport_overview_get_course_grades item. */
export interface CourseGradeOverview {
  courseid: number;
  /** Formatted course total (as configured in the gradebook), "-" when none. */
  grade: string;
  rawgrade: string | null;
  rank?: number;
}

export interface GradesOverviewResult {
  grades: CourseGradeOverview[];
}
