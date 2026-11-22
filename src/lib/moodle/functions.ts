import "server-only";

/**
 * Allowlist of web service functions the browser is permitted to invoke through
 * the /api/moodle proxy. Defense-in-depth: the token already scopes capability
 * in Moodle, but this stops arbitrary functions being called from the client.
 *
 * Functions newer than the oldest supported Moodle (4.1) may be listed; the UI
 * only calls them when site_info.functions reports them (useSiteFunctions).
 */
export const ALLOWED_WS_FUNCTIONS = new Set<string>([
  // Site & users
  "core_webservice_get_site_info",
  "core_user_get_users_by_field",
  "core_my_view_page",
  // Courses, contents & completion
  "core_course_get_enrolled_courses_by_timeline_classification",
  "core_course_get_recent_courses",
  "core_course_get_courses_by_field",
  "block_recentlyaccesseditems_get_recent_items",
  "core_enrol_get_users_courses",
  "core_course_get_contents",
  "core_course_get_course_module",
  "core_course_view_course",
  "core_completion_get_activities_completion_status",
  "core_completion_update_activity_completion_status_manually",
  "core_enrol_get_enrolled_users",
  // Calendar
  "core_calendar_get_action_events_by_timesort",
  "core_calendar_get_action_events_by_course",
  "core_calendar_get_calendar_monthly_view",
  "core_calendar_get_calendar_upcoming_view",
  // Groups
  "core_group_get_activity_groupmode",
  "core_group_get_activity_allowed_groups",
  // Grades
  "gradereport_overview_get_course_grades",
  "gradereport_user_get_grade_items",
  "gradereport_user_view_grade_report",
  // Messages & notifications
  "message_popup_get_popup_notifications",
  "message_popup_get_unread_popup_notification_count",
  "core_message_get_conversations",
  "core_message_get_conversation_messages",
  "core_message_send_instant_messages",
  "core_message_send_messages_to_conversation",
  "core_message_get_unread_conversations_count",
  "core_message_mark_all_notifications_as_read",
  "core_message_mark_notification_read",
  "core_message_mark_all_conversation_messages_as_read",
  "core_message_get_conversation_between_users",
  "core_message_get_self_conversation",
  "core_message_get_conversation",
  "core_message_get_member_info",
  // SCORM
  "mod_scorm_get_scorms_by_courses",
  "mod_scorm_get_scorm_scoes",
  "mod_scorm_get_scorm_user_data",
  "mod_scorm_get_scorm_sco_tracks",
  "mod_scorm_get_scorm_attempt_count",
  "mod_scorm_get_scorm_access_information",
  "mod_scorm_insert_scorm_tracks",
  "mod_scorm_launch_sco",
  "mod_scorm_view_scorm",
  // Assignments
  "mod_assign_get_assignments",
  "mod_assign_get_grades",
  "mod_assign_list_participants",
  "mod_assign_get_participant",
  "mod_assign_get_submission_status",
  "mod_assign_save_grade",
  "mod_assign_save_submission",
  "mod_assign_submit_for_grading",
  "mod_assign_start_submission",
  "mod_assign_remove_submission",
  "mod_assign_view_assign",
  "mod_assign_view_grading_table",
  "mod_assign_view_submission_status",
  // Forums (announcements)
  "mod_forum_get_forums_by_courses",
  "mod_forum_get_forum_discussions",
  // Content activities (page, url, file)
  "mod_page_get_pages_by_courses",
  "mod_page_view_page",
  "mod_url_get_urls_by_courses",
  "mod_url_view_url",
  "mod_resource_get_resources_by_courses",
  "mod_resource_view_resource",
  // Activity view logging (feeds recent items and completion-on-view; called only when site_info lists them)
  "mod_quiz_view_quiz",
  "mod_forum_view_forum",
  "mod_folder_view_folder",
  "mod_book_view_book",
  "mod_lesson_view_lesson",
  "mod_feedback_view_feedback",
  "mod_h5pactivity_view_h5pactivity",
  "mod_imscp_view_imscp",
  "mod_glossary_view_glossary",
  "mod_choice_view_choice",
  "mod_wiki_view_wiki",
  "mod_data_view_database",
  "mod_lti_view_lti",
  "mod_chat_view_chat",
  "mod_survey_view_survey",
  "mod_workshop_view_workshop",
  "mod_bigbluebuttonbn_view_bigbluebuttonbn",
]);
