import { redirect } from "next/navigation";
import { getSessionUser, getToken } from "@/lib/session";

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, user] = await Promise.all([getToken(), getSessionUser()]);
  if (token && user) redirect("/dashboard");
  return children;
}
