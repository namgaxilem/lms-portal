"use client";
import { use } from "react";
import { GradingWorkspace } from "@/components/grading/GradingWorkspace";

export default function AssignmentGradingPage({
  params,
  searchParams,
}: {
  params: Promise<{ cmid: string }>;
  searchParams: Promise<{ user?: string; course?: string }>;
}) {
  const { cmid } = use(params);
  const { user, course } = use(searchParams);
  return (
    <GradingWorkspace
      key={cmid}
      cmid={Number(cmid)}
      initialUser={Number(user) || undefined}
      courseHint={Number(course) || undefined}
    />
  );
}
