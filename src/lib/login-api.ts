/** Why a sign-in failed; returned by POST /api/auth/login as `code`. */
export type LoginErrorCode =
  /** Wrong username or password (Moodle "invalidlogin"). */
  | "invalidlogin"
  /** Moodle did not answer, answered with an HTTP error, or is not configured. */
  | "unreachable"
  /** The user must accept the site policy in Moodle first. */
  | "sitepolicynotagreed"
  /** Moodle requires a new password (forced change, expired, restored account). */
  | "passwordchange"
  /** A new password is required, but the account's auth plugin cannot change it (Moodle "nopasswordchangeforced"). */
  | "passwordchangeunavailable"
  /** Required profile fields are missing in Moodle. */
  | "profileincomplete"
  /** The account has not been confirmed yet. */
  | "notconfirmed"
  /** Moodle is in maintenance mode. */
  | "maintenance"
  /** Web services / the mobile service are disabled in Moodle. */
  | "serviceunavailable"
  | "badrequest"
  | "failed";

/** Error body of POST /api/auth/login. */
export interface LoginErrorBody {
  /** Technical message (English or Moodle's language): for logs, shown only for unknown errors. */
  error: string;
  code: LoginErrorCode;
  /** Where in Moodle the user can resolve the problem (site policy, password change…). */
  actionUrl?: string;
}
