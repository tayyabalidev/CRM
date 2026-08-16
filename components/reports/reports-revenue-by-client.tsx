"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReportClientRevenue } from "@/lib/services/reports";
import { formatMoney } from "@/lib/utils/money";
import { rangeLabel, type DashboardRange } from "@/lib/utils/dates";

export function ReportsRevenueByClient({
  data,
  currency,
  range,
}: {
  data: ReportClientRevenue[];
  currency: string;
  range: DashboardRange;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Revenue by client</CardTitle>
        <CardDescription>Top clients by payments in the last {rangeLabel(range)}.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon={<Users className="size-4" />}
            title="No client revenue yet"
            description="Payments linked to clients will appear in this chart."
          />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(value: number) => formatMoney(value, currency)}
                  className="fill-muted-foreground"
                />
                <YAxis
                  type="category"
                  dataKey="clientName"
                  width={96}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  className="fill-muted-foreground"
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) {
                      return null;
                    }

                    const point = payload[0].payload as ReportClientRevenue;

                    return (
                      <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-xs">
                        <p className="text-muted-foreground">{point.clientName}</p>
                        <p className="font-medium">{formatMoney(point.amount, currency)}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="amount" fill="var(--foreground)" fillOpacity={0.85} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
