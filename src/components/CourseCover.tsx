"use client";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Atom,
  BookOpen,
  Calculator,
  Globe,
  GraduationCap,
  Landmark,
  Library,
  Lightbulb,
  Palette,
  Sparkles,
} from "lucide-react";
import { FallbackImg, cn } from "@/components/ui";
import { courseStyle } from "@/lib/course-color";

/** Decorative subject-neutral icons; Moodle has no course "subject" field. */
const ICONS: LucideIcon[] = [BookOpen, GraduationCap, Lightbulb, Sparkles, Globe, Calculator, Library, Atom, Palette, Landmark];

export interface CoverCourse {
  id: number;
  fullname: string;
  shortname?: string;
  courseimage?: string | null;
}

/**
 * Course cover in the course's own colour.
 * - Real course image when Moodle has one. Portrait images (book covers are
 *   common) are shown whole on the coloured backdrop instead of being cropped.
 * - Otherwise a generated cover: soft shapes, a subject icon and the code.
 * Moodle's auto-generated SVG pattern (a data: URL) counts as "no image".
 * The cover is decorative (the image has empty alt text, the generated layer
 * is aria-hidden), so screen readers never read the course twice.
 */
export function CourseCover({
  course,
  variant = "wide",
  className,
}: {
  course: CoverCourse;
  variant?: "wide" | "book";
  className?: string;
}) {
  const [portrait, setPortrait] = useState(false);
  const Icon = ICONS[Math.abs(course.id) % ICONS.length];
  const image = course.courseimage && !course.courseimage.startsWith("data:") ? course.courseimage : null;
  const book = variant === "book";

  const generated = (
    <div aria-hidden className="relative flex h-full w-full flex-col justify-between p-4 text-white">
      {course.shortname && (
        <span className="w-fit max-w-full truncate rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-bold tracking-wide backdrop-blur-sm">
          {course.shortname}
        </span>
      )}
      <div className={cn("space-y-2", !book && "flex items-end justify-between gap-2 space-y-0")}>
        <span className={cn("grid place-items-center rounded-2xl bg-white/20 backdrop-blur-sm", book ? "h-10 w-10" : "h-12 w-12")}>
          <Icon size={book ? 22 : 26} strokeWidth={1.75} />
        </span>
        {book && <span className="line-clamp-3 block text-[12px] font-bold leading-tight drop-shadow-sm">{course.fullname}</span>}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-course-gradient",
        book ? "aspect-[3/4] rounded-xl shadow-course" : "aspect-video",
        className
      )}
      style={courseStyle(course.id)}
    >
      <span aria-hidden className="absolute -right-6 -top-8 -z-10 h-28 w-28 rounded-full bg-white/15" />
      <span aria-hidden className="absolute -bottom-10 -left-8 -z-10 h-32 w-32 rounded-full border-[14px] border-white/10" />
      {book && <span aria-hidden className="absolute inset-y-0 left-0 z-10 w-2.5 bg-black/15" />}
      <FallbackImg
        src={image}
        onLoad={(e) => {
          const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
          setPortrait(!!h && w / h < 1.2);
        }}
        className={cn(
          "h-full w-full",
          portrait && !book ? "object-contain p-2 drop-shadow-lg" : "object-cover"
        )}
        fallback={generated}
      />
    </div>
  );
}
