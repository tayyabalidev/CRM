import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReportProjectProfit } from "@/lib/services/reports";
import { formatDuration } from "@/lib/utils/duration";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils";

export function ReportsProjectProfitability({
  rows,
  currency,
}: {
  rows: ReportProjectProfit[];
  currency: string;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Project profitability</CardTitle>
        <CardDescription>
          Revenue from payments minus billable labor cost (hours × rate) in this period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="size-4" />}
            title="No project activity"
            description="Projects with budgets, payments, or tracked time will show here."
          />
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {rows.map((row) => (
                <div key={row.projectId} className="rounded-lg border px-3 py-3">
                  <Link href={`/projects/${row.projectId}`} className="font-medium hover:underline">
                    {row.projectName}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">{row.clientName}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Budget</dt>
                      <dd className="tabular-nums">
                        {row.budget == null ? "—" : formatMoney(row.budget, currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Revenue</dt>
                      <dd className="tabular-nums">{formatMoney(row.revenue, currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Labor</dt>
                      <dd className="tabular-nums">{formatMoney(row.laborCost, currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Profit</dt>
                      <dd
                        className={cn(
                          "font-medium tabular-nums",
                          row.profit < 0 && "text-destructive",
                        )}
                      >
                        {formatMoney(row.profit, currency)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDuration(row.trackedSeconds)} tracked · {formatDuration(row.billableSeconds)}{" "}
                    billable
                  </p>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Project</th>
                    <th className="pb-2 pr-3 font-medium">Budget</th>
                    <th className="pb-2 pr-3 font-medium">Revenue</th>
                    <th className="pb-2 pr-3 font-medium">Labor</th>
                    <th className="pb-2 pr-3 font-medium">Profit</th>
                    <th className="pb-2 font-medium">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.projectId} className="border-b last:border-0">
                      <td className="py-2.5 pr-3">
                        <Link href={`/projects/${row.projectId}`} className="font-medium hover:underline">
                          {row.projectName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{row.clientName}</p>
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {row.budget == null ? "—" : formatMoney(row.budget, currency)}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{formatMoney(row.revenue, currency)}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{formatMoney(row.laborCost, currency)}</td>
                      <td
                        className={cn(
                          "py-2.5 pr-3 font-medium tabular-nums",
                          row.profit < 0 && "text-destructive",
                        )}
                      >
                        {formatMoney(row.profit, currency)}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {formatDuration(row.trackedSeconds)}
                        <span className="text-[11px]">
                          {" "}
                          · {formatDuration(row.billableSeconds)} billable
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
