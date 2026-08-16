import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dashboardRanges, parseDashboardRange, rangeLabel } from "@/lib/utils/dates";

const shortLabels: Record<(typeof dashboardRanges)[number], string> = {
  "7d": "7d",
  "30d": "30d",
  "3m": "3m",
  "6m": "6m",
  "1y": "1y",
};

export function RangeToggle({
  value,
  basePath = "/",
}: {
  value: string | undefined;
  basePath?: string;
}) {
  const current = parseDashboardRange(value);

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
      {dashboardRanges.map((range) => (
        <Link
          key={range}
          href={`${basePath}?range=${range}`}
          aria-label={rangeLabel(range)}
          className={cn(
            buttonVariants({ variant: current === range ? "default" : "ghost", size: "xs" }),
            "min-w-10",
          )}
        >
          {shortLabels[range]}
        </Link>
      ))}
    </div>
  );
}
