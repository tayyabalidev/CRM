import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { taskListHref, type TaskListParams } from "@/lib/tasks/params";
import { cn } from "@/lib/utils";

export function TaskPagination({
  params,
  page,
  pageCount,
  total,
}: {
  params: TaskListParams;
  page: number;
  pageCount: number;
  total: number;
}) {
  if (total === 0 || params.view === "board") {
    return null;
  }

  const previousHref = page > 1 ? taskListHref(params, { page: page - 1 }) : null;
  const nextHref = page < pageCount ? taskListHref(params, { page: page + 1 }) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pageCount} · {total} {total === 1 ? "task" : "tasks"}
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
