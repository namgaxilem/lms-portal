import type { TFn } from "@/i18n/translate";
import type { LoginErrorBody, LoginErrorCode } from "@/lib/login-api";

/** i18n key of the message shown for each sign-in failure. */
const MESSAGE_KEYS: Record<LoginErrorCode, string> = {
  invalidlogin: "auth.errors.invalidlogin",
  unreachable: "auth.errors.unreachable",
  sitepolicynotagreed: "auth.errors.sitepolicynotagreed",
  passwordchange: "auth.errors.passwordchange",
  passwordchangeunavailable: "auth.errors.passwordchangeunavailable",
  profileincomplete: "auth.errors.profileincomplete",
  notconfirmed: "auth.errors.notconfirmed",
  maintenance: "auth.errors.maintenance",
  serviceunavailable: "auth.errors.serviceunavailable",
  badrequest: "auth.failed",
  failed: "auth.failed",
};

/** Label of the "fix it in Moodle" link, for codes the route sends an actionUrl with. */
const ACTION_KEYS: Partial<Record<LoginErrorCode, string>> = {
  sitepolicynotagreed: "auth.actions.reviewPolicy",
  passwordchange: "common.openExternal",
  profileincomplete: "common.openExternal",
};

export interface LoginError {
  message: string;
  /** Moodle's own wording, only for failures the portal does not recognise. */
  detail?: string;
  action?: { href: string; label: string };
}

function isErrorBody(value: unknown): value is LoginErrorBody {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as LoginErrorBody).code === "string" &&
    (value as LoginErrorBody).code in MESSAGE_KEYS
  );
}

/** Reads the error body of a failed POST /api/auth/login (tolerates non-JSON answers). */
export async function readLoginError(res: Response): Promise<LoginErrorBody> {
  const body: unknown = await res.json().catch(() => null);
  return isErrorBody(body) ? body : { code: "failed", error: "" };
}

/** Translated, user-facing description of a sign-in failure. */
export function describeLoginError(body: LoginErrorBody, t: TFn): LoginError {
  const actionKey = ACTION_KEYS[body.code];
  return {
    message: t(MESSAGE_KEYS[body.code]),
    detail: body.code === "failed" && body.error ? body.error : undefined,
    action: actionKey && body.actionUrl ? { href: body.actionUrl, label: t(actionKey) } : undefined,
  };
}
