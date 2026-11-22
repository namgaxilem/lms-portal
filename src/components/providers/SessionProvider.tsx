"use client";
import { createContext, useContext } from "react";
import type { SessionUser } from "@/lib/moodle/types";

const SessionContext = createContext<{ user: SessionUser } | null>(null);

/** Exposes the signed-in Moodle user (from the session cookie) to client components. */
export function SessionProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <SessionContext.Provider value={{ user }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
