"use client";
import { useMemo } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { useLocale } from "@/i18n/I18nProvider";
import { useMoodle } from "@/lib/client-api";
import type { UserGrades } from "@/lib/moodle/types";
import { summariseGrades } from "./lib";

/**
 * The user's own grade report for one course (gradereport_user_get_grade_items),
 * normalised. Cached for a minute, so every component asking for the same course
 * shares one request.
 */
export function useCourseGradeReport(courseId: number) {
  const { user } = useSession();
  const { locale } = useLocale();
  const r = useMoodle<UserGrades>(
    "gradereport_user_get_grade_items",
    { courseid: courseId, userid: user.id },
    false,
    { cacheMs: 60_000 }
  );
  const summary = useMemo(() => summariseGrades(r.data?.usergrades?.[0]?.gradeitems ?? [], locale), [r.data, locale]);
  return { ...r, summary };
}
