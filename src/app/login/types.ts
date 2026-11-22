/** Moodle public settings shown on the login page (resolved on the server). */
export interface LoginSiteSettings {
  /** Moodle's password-reset page, or the admin's custom URL; null when unknown. */
  forgotPasswordUrl: string | null;
  /** Users may sign in with their email address. */
  loginViaEmail: boolean;
  /** Present while Moodle is in maintenance mode; `message` is HTML and may be "". */
  maintenance: { message: string } | null;
  /** Admin-written sign-in instructions (HTML). */
  instructions: string | null;
}
