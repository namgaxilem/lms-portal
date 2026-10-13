import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { accountRole, isStaffRole } from "@/lib/format";

/**
 * Guards every /teacher/* page. Only users whose detected account role is
 * teacher or admin may view or access these pages; everyone else is sent back
 * to the dashboard. This mirrors the staff-only nav gating in AppLayout so the
 * privilege boundary holds even when a page is reached by direct URL.
 */
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!isStaffRole(accountRole(user))) redirect("/dashboard");

  return <>{children}</>;
}
