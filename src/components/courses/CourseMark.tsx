"use client";
import { FallbackImg, cn } from "@/components/ui";
import { courseStyle } from "@/lib/course-color";
import type { CoverCourse } from "@/components/CourseCover";
import { monogram, uploadedCourseImage } from "./lib";

/* Sizes are a prop: `cn` does not merge Tailwind classes, so a size passed in
   `className` would not reliably override the default one. */
const SIZES = {
  xs: "size-10 rounded-xl text-sm",
  sm: "size-11 rounded-2xl text-sm",
  md: "size-12 rounded-xl text-base",
  lg: "size-14 rounded-2xl text-base",
};

/**
 * Small square course tile for dense rows (list view, pickers): the uploaded
 * course image, else a monogram on the course colour. CourseCover's generated
 * artwork needs a wide frame, so compact layouts use this instead.
 */
export function CourseMark({
  course,
  size = "lg",
  className,
}: {
  course: CoverCourse;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden bg-course-gradient text-white shadow-course",
        SIZES[size],
        className
      )}
      style={courseStyle(course.id)}
    >
      <FallbackImg
        src={uploadedCourseImage(course.courseimage)}
        className="h-full w-full object-cover"
        fallback={
          <span className="font-extrabold tracking-tight drop-shadow-sm">
            {monogram(course.fullname || course.shortname || "")}
          </span>
        }
      />
    </div>
  );
}
