"use client";
import { use } from "react";
import { AssignmentView } from "@/components/assignment/AssignmentView";

export default function AssignmentPage({ params }: { params: Promise<{ cmid: string }> }) {
  const { cmid } = use(params);
  return <AssignmentView cmid={Number(cmid) || 0} />;
}
