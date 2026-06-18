import "server-only";
import { moodleCall } from "./client";
import type {
  AssignmentsResult,
  ConversationMessagesResult,
  ConversationsResult,
  CourseSection,
  NotificationsResult,
  SiteInfo,
  TimelineCourse,
  UserGrades,
} from "./types";

/**
 * Allowlist of web service functions the browser is permitted to invoke through
 * the /api/moodle proxy. Defense-in-depth: the token already scopes capability
 * in Moodle, but this stops arbitrary functions being called from the client.
 */
export const ALLOWED_WS_FUNCTIONS = new Set<string>([
  "core_webservice_get_site_info",
  "core_user_get_users_by_field",
  "core_course_get_enrolled_courses_by_timeline_classification",
  "core_enrol_get_users_courses",
  "core_course_get_contents",
  "mod_scorm_get_scorms_by_courses",
  "mod_quiz_get_quizzes_by_courses",
  "mod_quiz_get_user_attempts",
  "message_popup_get_popup_notifications",
  "message_popup_get_unread_popup_notification_count",
  "core_message_get_conversations",
  "core_message_get_conversation_messages",
  "core_message_send_instant_messages",
  "core_message_mark_all_notifications_as_read",
  "gradereport_user_get_grade_items",
  "mod_assign_get_assignments",
  "mod_assign_get_submissions",
  "mod_assign_get_grades",
  "core_enrol_get_enrolled_users",
]);

export function getSiteInfo(token: string) {
  return moodleCall<SiteInfo>(token, "core_webservice_get_site_info");
}

export function getTimelineCourses(
  token: string,
  classification: "all" | "inprogress" | "future" | "past" = "all"
) {
  return moodleCall<{ courses: TimelineCourse[]; nextoffset: number }>(
    token,
    "core_course_get_enrolled_courses_by_timeline_classification",
    { classification, limit: 0, offset: 0, sort: "fullname" }
  );
}

export function getCourseContents(token: string, courseid: number) {
  return moodleCall<CourseSection[]>(token, "core_course_get_contents", {
    courseid,
  });
}

export function getPopupNotifications(token: string, useridto: number) {
  return moodleCall<NotificationsResult>(
    token,
    "message_popup_get_popup_notifications",
    { useridto, newestfirst: 1, limit: 30, offset: 0 }
  );
}

export function getConversations(token: string, userid: number) {
  return moodleCall<ConversationsResult>(
    token,
    "core_message_get_conversations",
    { userid, limitfrom: 0, limitnum: 50 }
  );
}

export function getConversationMessages(
  token: string,
  currentuserid: number,
  convid: number
) {
  return moodleCall<ConversationMessagesResult>(
    token,
    "core_message_get_conversation_messages",
    { currentuserid, convid, limitfrom: 0, limitnum: 100, newest: 0 }
  );
}

export function getUserGrades(token: string, courseid: number, userid: number) {
  return moodleCall<UserGrades>(token, "gradereport_user_get_grade_items", {
    courseid,
    userid,
  });
}

export function getAssignments(token: string, courseids: number[]) {
  return moodleCall<AssignmentsResult>(token, "mod_assign_get_assignments", {
    courseids,
  });
}
