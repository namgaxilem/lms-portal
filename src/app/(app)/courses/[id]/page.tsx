"use client";
import { use } from "react";
import { CourseDetail } from "@/components/course/CourseDetail";
import { CourseNotFound } from "@/components/course/CourseNotFound";

export default function CourseDetailPage({ params }: PageProps<"/courses/[id]">) {
  const { id } = use(params);
  const courseid = Number(id);
  if (!Number.isInteger(courseid) || courseid <= 0) return <CourseNotFound />;
  // Keyed so switching courses starts from a clean state (tab, open sections).
  return <CourseDetail key={courseid} courseid={courseid} />;
}
