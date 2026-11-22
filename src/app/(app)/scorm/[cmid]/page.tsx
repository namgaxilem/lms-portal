"use client";
import { use } from "react";
import { ScormPlayer } from "@/components/scorm/ScormPlayer";

/**
 * /scorm/{cmid}[?course={courseId}] — the native SCORM player. Links that know
 * the course should pass `?course=`: it saves the player one Moodle round trip
 * (core_course_get_course_module) before it can load the package.
 */
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
