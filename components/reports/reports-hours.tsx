import { Clock3 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils/duration";

export function ReportsHours({
  trackedSeconds,
  billableSeconds,
}: {
  trackedSeconds: number;
  billableSeconds: number;
}) {
  const nonBillable = Math.max(trackedSeconds - billableSeconds, 0);
  const billablePct =
    trackedSeconds > 0 ? Math.round((billableSeconds / trackedSeconds) * 100) : 0;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Tracked hours</CardTitle>
        <CardDescription>Time entries that ended in this period.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-muted/30 px-3 py-3">
          <p className="text-xs text-muted-foreground">Tracked</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{formatDuration(trackedSeconds)}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 px-3 py-3">
          <p className="text-xs text-muted-foreground">Billable</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{formatDuration(billableSeconds)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{billablePct}% of tracked</p>
        </div>
        <div className="rounded-lg border bg-muted/30 px-3 py-3">
          <p className="text-xs text-muted-foreground">Non-billable</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{formatDuration(nonBillable)}</p>
        </div>
        {trackedSeconds === 0 ? (
          <div className="sm:col-span-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="size-4" />
            No completed time entries in this period.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
