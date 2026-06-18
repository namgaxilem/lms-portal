"use client";
import Link from "next/link";
import { useT, useLocale } from "@/i18n/I18nProvider";
import { MaterialIcon } from "@/components/MaterialIcon";
import type { TimelineCourse } from "@/lib/moodle/types";

const GRADIENTS = [
  "from-primary to-tertiary",
  "from-secondary to-primary",
  "from-tertiary to-primary-container",
  "from-primary-container to-secondary",
];

/** Moodle returns Unix seconds; 0 means "not set". */
function formatDate(unix: number | undefined, locale: string) {
  if (!unix || unix <= 0) return null;
  return new Date(unix * 1000).toLocaleDateString(
    locale === "vi" ? "vi-VN" : "en-US",
    { day: "2-digit", month: "short", year: "numeric" }
  );
}

export function CourseGrid({ courses }: { courses: TimelineCourse[] }) {
  const t = useT();
  const { locale } = useLocale();

  if (!courses.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-surface-container-lowest p-lg text-center card-elevation">
        <MaterialIcon name="school" className="!text-5xl text-outline-variant" />
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          {t("courses.noCourses")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((c, i) => {
        const pct =
          typeof c.progress === "number" ? Math.round(c.progress) : null;
        const startDate = formatDate(c.startdate, locale);
        const endDate = formatDate(c.enddate, locale);
        return (
          <Link
            key={c.id}
            href={`/courses/${c.id}`}
            className="lift group overflow-hidden rounded-xl bg-surface-container-lowest card-elevation animate-fade-in-up"
            style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
          >
            <div className="relative h-56 w-full overflow-hidden">
              {c.courseimage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.courseimage}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div
                  className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`}
                >
                  <span className="px-4 text-center font-headline-sm text-headline-sm text-white">
                    {c.shortname}
                  </span>
                </div>
              )}
              <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-bold text-on-primary shadow-sm">
                {pct !== null && pct < 100
                  ? t("courses.inProgress")
                  : t("courses.enrolled")}
              </div>
            </div>

            <div className="space-y-3 p-6">
              <div>
                <h4 className="line-clamp-2 font-headline-sm text-headline-sm text-on-surface">
                  {c.fullname}
                </h4>
                <p className="mt-1 line-clamp-1 font-body-sm text-body-sm text-on-surface-variant">
                  {c.shortname}
                </p>
              </div>

              {(startDate || endDate) && (
                <div className="space-y-2 border-t border-outline-variant/20 pt-3">
                  {startDate && (
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <MaterialIcon name="event_available" className="!text-sm" />
                      <span>
                        {t("courses.starts")}: {startDate}
                      </span>
                    </div>
                  )}
                  {endDate && (
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <MaterialIcon name="event_busy" className="!text-sm" />
                      <span>
                        {t("courses.ends")}: {endDate}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {pct !== null && (
                <div className="space-y-2 border-t border-outline-variant/20 pt-3">
                  <div className="flex justify-between text-xs font-bold text-outline">
                    <span>{t("courses.progress")}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-bold text-on-primary transition-opacity group-hover:opacity-90">
                <MaterialIcon name="play_circle" />
                {t("courses.resume")}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
