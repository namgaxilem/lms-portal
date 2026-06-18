import { redirect } from "next/navigation";
import { getSessionUser, getToken, getViewRole } from "@/lib/session";
import { SessionProvider } from "@/components/providers/SessionProvider";
import AppLayout from "@/components/layout/AppLayout";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, user, role] = await Promise.all([
    getToken(),
    getSessionUser(),
    getViewRole(),
  ]);

  if (!token || !user) redirect("/login");

  return (
    <SessionProvider user={user} initialRole={role}>
      <AppLayout>{children}</AppLayout>
    </SessionProvider>
  );
}
