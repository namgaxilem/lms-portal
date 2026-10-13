"use client";
import { use } from "react";
import { ScormPlayer } from "@/components/scorm/ScormPlayer";

export default function ScormPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ cmid: string }>;
  searchParams: Promise<{ course?: string }>;
}) {
  const { cmid } = use(params);
  const { course } = use(searchParams);
  return <ScormPlayer cmid={Number(cmid)} courseHint={Number(course) || undefined} />;
}
