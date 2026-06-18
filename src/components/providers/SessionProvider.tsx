"use client";
import { createContext, useContext, useState } from "react";
import type { SessionUser, ViewRole } from "@/lib/moodle/types";

interface SessionContextValue {
  user: SessionUser;
  role: ViewRole;
  setRole: (role: ViewRole) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  user,
  initialRole,
  children,
}: {
  user: SessionUser;
  initialRole: ViewRole;
  children: React.ReactNode;
}) {
  const [role, setRoleState] = useState<ViewRole>(initialRole);

  const setRole = async (next: ViewRole) => {
    setRoleState(next);
    await fetch("/api/auth/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
  };

  return (
    <SessionContext.Provider value={{ user, role, setRole }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
