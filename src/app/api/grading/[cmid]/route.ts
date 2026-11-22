import { NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import { authorize, errorResponse, loadSetup, parseId } from "../_lib/grading";

/**
 * Grading setup of one assignment: method (points / scale / rubric / marking
 * guide), max grade, scale items and the rubric or guide definition. Gated by
 * the caller's own token; privileged parts degrade to `issue` instead of
 * failing (see loadSetup).
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/grading/[cmid]">) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const cmid = parseId((await ctx.params).cmid);
  if (!cmid) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  try {
    const cm = await authorize(token, cmid);
    return NextResponse.json({ data: await loadSetup(token, cm) });
  } catch (e) {
    return errorResponse(e);
  }
}
