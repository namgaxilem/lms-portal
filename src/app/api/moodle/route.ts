import { NextResponse } from "next/server";
import { moodleCall, MoodleError } from "@/lib/moodle/client";
import { ALLOWED_WS_FUNCTIONS } from "@/lib/moodle/functions";
import { getLocale } from "@/i18n/server";
import { clearSession, getToken } from "@/lib/session";

const SESSION_ENDING = new Set([
  "invalidtoken",
  "sitepolicynotagreed",
  "forcepasswordchangenotice",
  "usernotfullysetup",
]);

/**
 * Authenticated proxy. The browser posts { wsfunction, args, filter? }; the token
 * is read from the httpOnly cookie server-side and never exposed to client
 * JavaScript. `filter: false` reads text unfiltered (see moodleCall).
 */
export async function POST(request: Request) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let wsfunction: string;
  let args: Record<string, unknown>;
  let filter: boolean;
  try {
    const body = await request.json();
    wsfunction = body.wsfunction;
    args = body.args ?? {};
    filter = body.filter !== false;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!ALLOWED_WS_FUNCTIONS.has(wsfunction)) {
    return NextResponse.json(
      { error: `Web service function not allowed: ${wsfunction}` },
      { status: 403 }
    );
  }

  try {
    const data = await moodleCall(token, wsfunction, args, { lang: await getLocale(), filter });
    return NextResponse.json({ data });
  } catch (e) {
    // Network failure, or Moodle answered with an HTTP error (errorcode = status).
    if (!(e instanceof MoodleError) || /^\d+$/.test(e.errorcode ?? "")) {
      return NextResponse.json({ error: "Moodle is unreachable" }, { status: 502 });
    }
    // The token no longer works (expired/revoked) or Moodle now blocks the account
    // until the user acts (new site policy, forced password change, incomplete
    // profile): end the portal session; signing in again explains what to do.
    if (SESSION_ENDING.has(e.errorcode ?? "")) {
      await clearSession();
      return NextResponse.json({ error: e.message, errorcode: e.errorcode }, { status: 401 });
    }
    return NextResponse.json({ error: e.message, errorcode: e.errorcode }, { status: 400 });
  }
}
