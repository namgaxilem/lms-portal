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
  grade: number;
  intro: string;
}

export interface AssignmentsResult {
  courses: { id: number; fullname: string; assignments: Assignment[] }[];
}
