/**
 * Moodle connection config. Server-side only values are read from env at runtime.
 */
export const MOODLE_URL = (process.env.MOODLE_URL ?? "").replace(/\/+$/, "");
export const MOODLE_SERVICE = process.env.MOODLE_SERVICE ?? "moodle_mobile_app";

export const REST_ENDPOINT = `${MOODLE_URL}/webservice/rest/server.php`;
export const TOKEN_ENDPOINT = `${MOODLE_URL}/login/token.php`;

export function assertConfigured() {
  if (!MOODLE_URL) {
    throw new Error(
      "MOODLE_URL is not set. Copy .env.example to .env.local and set your Moodle site URL."
    );
  }
}
