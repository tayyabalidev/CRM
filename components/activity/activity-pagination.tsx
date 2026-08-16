import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { activityListHref, type ActivityListParams } from "@/lib/activity/params";
import { cn } from "@/lib/utils";

export function ActivityPagination({
  params,
  page,
  pageCount,
  total,
}: {
  params: ActivityListParams;
  page: number;
  pageCount: number;
  total: number;
}) {
  if (total === 0) {
    return null;
  }

  const previousHref = page > 1 ? activityListHref(params, { page: page - 1 }) : null;
  const nextHref = page < pageCount ? activityListHref(params, { page: page + 1 }) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pageCount} · {total} {total === 1 ? "event" : "events"}
      </p>
      <div className="flex gap-2">
        {previousHref ? (
          <Link href={previousHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <ChevronLeft />
            Previous
          </Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>
            <ChevronLeft />
            Previous
          </span>
        )}
        {nextHref ? (
          <Link href={nextHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Next
            <ChevronRight />
          </Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>
            Next
            <ChevronRight />
          </span>
        )}
      </div>
    </div>
  );
}
