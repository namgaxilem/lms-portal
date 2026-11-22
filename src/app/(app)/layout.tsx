import { redirect } from "next/navigation";
import { getSessionUser, getToken } from "@/lib/session";
import { SessionProvider } from "@/components/providers/SessionProvider";
import AppLayout from "@/components/layout/AppLayout";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, user] = await Promise.all([getToken(), getSessionUser()]);

  if (!token || !user) redirect("/login");

  return (
    <SessionProvider user={user}>
      <AppLayout>{children}</AppLayout>
    </SessionProvider>
  );
}
