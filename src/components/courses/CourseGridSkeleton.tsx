import { Card, Skeleton } from "@/components/ui";
import { GRID_CLASS, LIST_CLASS } from "./layout";

/** Loading placeholder shaped like CourseGrid in the same view. */
export function CourseGridSkeleton({ view = "grid", count = 6 }: { view?: "grid" | "list"; count?: number }) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (view === "list") {
    return (
      <div className={LIST_CLASS}>
        {items.map((i) => (
          <Card key={i} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <Skeleton className="size-14 shrink-0 rounded-2xl sm:size-16" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-5 w-2/5" />
            </div>
            <Skeleton className="size-12 shrink-0 rounded-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="@container">
      <div className={GRID_CLASS}>
        {items.map((i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex justify-between border-t border-line/70 pt-3">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
