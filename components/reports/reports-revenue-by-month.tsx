import { TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReportRevenuePoint } from "@/lib/services/reports";
import { rangeLabel, type DashboardRange } from "@/lib/utils/dates";

export function ReportsRevenueByMonth({
  data,
  currency,
  range,
}: {
  data: ReportRevenuePoint[];
  currency: string;
  range: DashboardRange;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Revenue by month</CardTitle>
        <CardDescription>Payments grouped by month for the last {rangeLabel(range)}.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.every((point) => point.amount === 0) ? (
          <EmptyState
            icon={<TrendingUp className="size-4" />}
            title="No revenue in this period"
            description="Record payments to see monthly revenue here."
          />
        ) : (
          <RevenueChart data={data} currency={currency} />
        )}
      </CardContent>
    </Card>
  );
}
