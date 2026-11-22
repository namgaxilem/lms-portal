import { Card, Skeleton } from "@/components/ui";

/** Placeholder with the shape of a course report (stat tiles + list). */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-36 rounded-card" />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card className="space-y-4 p-5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-2 w-32 sm:block" />
        </div>
      ))}
    </Card>
  );
}

export function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-hero" />
      <StatsSkeleton />
      <ListSkeleton />
    </div>
  );
}
