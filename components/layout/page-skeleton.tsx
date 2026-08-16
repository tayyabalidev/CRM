import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({
  stats = 4,
  showChart = true,
}: {
  stats?: number;
  showChart?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: stats }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-card p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-24" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>

      {showChart ? (
        <div className="rounded-xl border bg-card p-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-3 w-48" />
          <Skeleton className="mt-6 h-56 w-full" />
        </div>
      ) : null}

      <div className="rounded-xl border bg-card">
        <div className="space-y-0 p-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 border-b px-2 py-3 last:border-0">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-24 sm:block" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
