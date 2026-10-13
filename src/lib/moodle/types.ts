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
}

/** Highest account role, used for display and navigation. */
export type AccountRole = "admin" | "teacher" | "student";

/** The portal's serializable, non-sensitive user record (stored in a cookie). */
export interface SessionUser {
  id: number;
  fullname: string;
  username: string;
  pictureurl: string;
  sitename: string;
  isSiteAdmin: boolean;
  /** Highest role across the site (admin) or any course (teacher), else student. */
  highestRole: AccountRole;
}

export type ViewRole = "student" | "teacher";

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
}

export interface TimelineCourse {
  id: number;
  fullname: string;
  shortname: string;
  summary: string;
  courseimage?: string;
  progress?: number | null;
  hasprogress?: boolean;
  startdate?: number;
  enddate?: number;
  category?: number;
  visible?: number;
  hidden?: boolean;
}

/** A person the current user is permitted to message (global search result). */
export interface SearchUser {
  id: number;
  fullname: string;
  profileimageurl?: string;
}

export interface SearchCourseHit {
  id: number;
  fullname: string;
  shortname: string;
  courseimage?: string;
}

export interface SearchNotificationHit {
  id: number;
  subject: string;
  smallmessage: string;
  timecreated: number;
  read: boolean;
}

/** Grouped payload returned by /api/search. */
export interface SearchResults {
  query: string;
  courses: SearchCourseHit[];
  notifications: SearchNotificationHit[];
  users: SearchUser[];
}

export interface CourseModuleContent {
  type: string;
  filename?: string;
  fileurl?: string;
  mimetype?: string;
}

export interface CourseModule {
  id: number;
  name: string;
  /** e.g. "scorm", "quiz", "resource", "url", "forum", "assign", "label", "page" */
  modname: string;
  modplural?: string;
  /** Activity context id (Moodle 3.10+). */
  contextid?: number;
  url?: string;
  modicon?: string;
  description?: string;
  visible?: number;
  uservisible?: boolean;
  completion?: number;
  completiondata?: { state: number } | null;
  contents?: CourseModuleContent[];
}

export interface CourseSection {
  id: number;
  name: string;
  section: number;
  summary: string;
  visible?: number;
  uservisible?: boolean;
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

export interface Conversation {
  id: number;
  name: string;
  type: number;
  unreadcount: number | null;
  members: { id: number; fullname: string; profileimageurl: string }[];
  messages: { id: number; text: string; timecreated: number; useridfrom: number }[];
}

export interface ConversationsResult {
  conversations: Conversation[];
}

export interface ConversationMessage {
  id: number;
  useridfrom: number;
  text: string;
  timecreated: number;
}

export interface ConversationMessagesResult {
  id: number;
  members: { id: number; fullname: string; profileimageurl: string }[];
  messages: ConversationMessage[];
}

export interface GradeItem {
  id: number;
  itemname: string | null;
  itemtype: string;
  itemmodule: string | null;
  graderaw: number | null;
  gradeformatted: string;
  grademin: number;
  grademax: number;
  percentageformatted: string;
  feedback: string;
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
    grade?: { grade: string; timemodified: number };
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
  courses: { id: number; fullname: string; assignments: Assignment[] }[];
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
  maxgrade?: number;
  grademethod?: number;
  /** 0 = no, 1 = when previous attempt completed, 2 = always. */
  forcenewattempt?: number;
  lastattemptlock?: boolean;
  hidebrowse?: boolean;
  /** 3 = TOC disabled. */
  hidetoc?: number;
  /** Continue to the next SCO automatically when one finishes. */
  auto?: boolean;
  autocommit?: boolean;
  timeopen?: number;
  timeclose?: number;
  protectpackagedownloads?: boolean;
}

export interface ScormsByCoursesResult {
  scorms: Scorm[];
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
  canviewreport?: boolean;
  canskipview?: boolean;
}

export interface CourseModuleInfo {
  cm: { id: number; course: number; instance: number; name: string; modname: string };
}

/* ---------------- Assignment grading metadata (/api/grading/[cmid]) ---------------- */

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

export interface GradingMeta {
  /** "simple" = points/scale; "rubric" / "guide" = advanced grading. */
  method: "simple" | "rubric" | "guide";
  /** Max points when the assignment is graded on points; null for scale/none. */
  maxgrade: number | null;
  /** Scale items (1-based when saving) when graded with a scale. */
  scale: string[] | null;
  rubric?: { definitionid: number; name: string; criteria: RubricCriterion[] };
  guide?: { definitionid: number; name: string; criteria: GuideCriterion[]; comments: string[] };
  /** Current fillings for `?userid=` (latest attempt), if any. */
  fillings?: GradingFilling[];
  /**
   * False when the assignment uses advanced grading / a scale but the server
   * has no MOODLE_GRADING_TOKEN to read its definition.
   */
  complete: boolean;
  /** Advanced grading is selected but no rubric/guide has been defined in Moodle yet. */
  notDefined?: boolean;
}
