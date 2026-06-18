import { NextResponse } from "next/server";
import { setViewRole } from "@/lib/session";
import type { ViewRole } from "@/lib/moodle/types";

export async function POST(request: Request) {
  const { role } = (await request.json()) as { role?: ViewRole };
  if (role !== "student" && role !== "teacher") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  await setViewRole(role);
  return NextResponse.json({ role });
}
