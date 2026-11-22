import { redirect } from "next/navigation";
import { getLocale } from "@/i18n/server";
import { getSessionUser, getToken } from "@/lib/session";
import { accountRole, isStaffRole } from "@/lib/format";
import { moodleCall } from "@/lib/moodle/client";
import type { AssignmentsResult } from "@/lib/moodle/types";

/**
 * Whether Moodle lets the user grade any assignment (mod/assign:grade, checked
 * per course). Only asked for accounts without a staff role, e.g. a custom
 * grader role, so students who open /teacher/* cost one call.
 */
async function canGradeAnything(): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  try {
    const { courses } = await moodleCall<AssignmentsResult>(
      token,
      "mod_assign_get_assignments",
      { capabilities: ["mod/assign:grade"] },
      { lang: await getLocale() }
    );
    return courses.some((c) => c.assignments.length > 0);
  } catch {
    return false;
  }
}

/**
 * Keeps people who cannot grade out of the /teacher/* screens. This is
 * navigation gating only: the role comes from the session cookie, which is not
 * signed. The real boundary is Moodle itself: every grading read and write uses
 * the user's own token, and /api/grading checks grading rights with that token
 * before reading privileged data.
 */
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!isStaffRole(accountRole(user)) && !(await canGradeAnything())) redirect("/dashboard");
  return <>{children}</>;
}
