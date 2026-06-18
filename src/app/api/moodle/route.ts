import { NextResponse } from "next/server";
import { moodleCall, MoodleError } from "@/lib/moodle/client";
import { ALLOWED_WS_FUNCTIONS } from "@/lib/moodle/functions";
import { getToken } from "@/lib/session";

/**
 * Authenticated proxy. The browser posts { wsfunction, args }; the token is read
 * from the httpOnly cookie server-side and never exposed to client JavaScript.
 */
export async function POST(request: Request) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let wsfunction: string;
  let args: Record<string, unknown>;
  try {
    const body = await request.json();
    wsfunction = body.wsfunction;
    args = body.args ?? {};
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
    const data = await moodleCall(token, wsfunction, args);
    return NextResponse.json({ data });
  } catch (e) {
    const err = e as MoodleError;
    return NextResponse.json(
      { error: err.message, errorcode: err.errorcode },
      { status: 400 }
    );
  }
}
