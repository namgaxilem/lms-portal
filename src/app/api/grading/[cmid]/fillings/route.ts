import { NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import { authorize, errorResponse, loadFillings, loadSetup, parseId } from "../../_lib/grading";

/**
 * Saved rubric / marking-guide fillings of one grade: `?gradeid=` is the
 * assign_grades id from mod_assign_get_grades. Only called for students who
 * already have a grade.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/grading/[cmid]/fillings">) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const cmid = parseId((await ctx.params).cmid);
  const gradeid = parseId(new URL(request.url).searchParams.get("gradeid"));
  if (!cmid || !gradeid) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  try {
    const cm = await authorize(token, cmid);
    const setup = await loadSetup(token, cm);
    return NextResponse.json({ data: await loadFillings(setup, gradeid) });
  } catch (e) {
    return errorResponse(e);
  }
}
