import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { paymentListHref, type PaymentListParams } from "@/lib/payments/params";
import { cn } from "@/lib/utils";

export function PaymentPagination({
  params,
  page,
  pageCount,
  total,
}: {
  params: PaymentListParams;
  page: number;
  pageCount: number;
  total: number;
}) {
  if (total === 0) {
    return null;
  }

  const previousHref = page > 1 ? paymentListHref(params, { page: page - 1 }) : null;
  const nextHref = page < pageCount ? paymentListHref(params, { page: page + 1 }) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pageCount} · {total} {total === 1 ? "payment" : "payments"}
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
