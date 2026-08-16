import { TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { RangeToggle } from "@/components/dashboard/range-toggle";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RevenuePoint } from "@/lib/services/dashboard";
import { parseDashboardRange, rangeLabel } from "@/lib/utils/dates";

export function RevenueSection({
  data,
  currency,
  range,
  portal = false,
}: {
  data: RevenuePoint[];
  currency: string;
  range: string | undefined;
  portal?: boolean;
}) {
  const selected = parseDashboardRange(range);

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{portal ? "Payments" : "Revenue"}</CardTitle>
          <CardDescription>
            {portal
              ? `Payments recorded over the last ${rangeLabel(selected)}.`
              : `Recorded payments over the last ${rangeLabel(selected)}.`}
          </CardDescription>
        </div>
        <RangeToggle value={range} />
      </CardHeader>
      <CardContent>
        {data.every((point) => point.amount === 0) ? (
          <EmptyState
            icon={<TrendingUp className="size-4" />}
            title="No payments in this period"
            description="When you record payments, revenue over time will show in this chart."
          />
        ) : (
          <RevenueChart data={data} currency={currency} />
        )}
      </CardContent>
    </Card>
  );
}
