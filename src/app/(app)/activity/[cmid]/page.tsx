"use client";
import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, PackageOpen } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { Card, EmptyState, QueryState, Skeleton } from "@/components/ui";
import {
  PageViewer,
  ResourceViewer,
  UnsupportedActivity,
  UrlViewer,
} from "@/components/activity/ActivityViewers";
import type { CourseModuleInfo } from "@/lib/moodle/types";

/** Modules that have a dedicated portal page elsewhere. */
function redirectFor(modname: string, cmid: number, role: "student" | "teacher") {
  if (modname === "scorm") return `/scorm/${cmid}`;
  if (modname === "assign") {
    return role === "teacher" ? `/teacher/grading/${cmid}` : `/assignments/${cmid}`;
  }
  return null;
}

export default function ActivityPage({
  params,
}: {
  params: Promise<{ cmid: string }>;
}) {
  const { cmid: raw } = use(params);
  const cmid = Number(raw);
  const valid = Number.isInteger(cmid) && cmid > 0;
  const { role } = useSession();
  const t = useT();
  const router = useRouter();

  const { data, loading, error } = useMoodle<CourseModuleInfo>(
    "core_course_get_course_module",
    { cmid },
    !valid
  );
  const cm = data?.cm;
  const redirect = cm ? redirectFor(cm.modname, cmid, role) : null;

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  const skeleton = (
    <div className="space-y-4">
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  let body: React.ReactNode;
  if (!valid || (!loading && !error && !cm)) {
    body = (
      <Card>
        <EmptyState
          icon={PackageOpen}
          title={t("activity.notFound")}
          hint={t("activity.notFoundHint")}
        />
      </Card>
    );
  } else if (!cm || redirect) {
    body = (
      <QueryState loading={loading || !!redirect} error={error} skeleton={skeleton}>
        {null}
      </QueryState>
    );
  } else if (cm.modname === "resource") {
    body = <ResourceViewer cmid={cmid} courseid={cm.course} />;
  } else if (cm.modname === "page") {
    body = <PageViewer cmid={cmid} courseid={cm.course} />;
  } else if (cm.modname === "url") {
    body = <UrlViewer cmid={cmid} courseid={cm.course} />;
  } else {
    body = <UnsupportedActivity cmid={cmid} modname={cm.modname} name={cm.name} />;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={cm ? `/courses/${cm.course}` : "/courses"}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft size={14} strokeWidth={1.75} />
        {t("activity.backToCourse")}
      </Link>
      {body}
    </div>
  );
}
