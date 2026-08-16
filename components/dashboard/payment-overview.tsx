import { CircleDollarSign } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/money";

export function PaymentOverview({
  paid,
  pending,
  overdue,
  currency,
}: {
  paid: number;
  pending: number;
  overdue: number;
  currency: string;
}) {
  const total = paid + pending + overdue;
  const paidPct = total === 0 ? 0 : (paid / total) * 100;
  const pendingPct = total === 0 ? 0 : (pending / total) * 100;
  const overduePct = total === 0 ? 0 : (overdue / total) * 100;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Payment overview</CardTitle>
        <CardDescription>Paid, waiting, and overdue amounts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {total === 0 ? (
          <EmptyState
            icon={<CircleDollarSign className="size-4" />}
            title="No payments yet"
            description="Paid, pending, and overdue amounts will appear here after invoices and payments are recorded."
          />
        ) : (
          <>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <span className="bg-foreground" style={{ width: `${paidPct}%` }} />
              <span className="bg-foreground/40" style={{ width: `${pendingPct}%` }} />
              <span className="bg-destructive" style={{ width: `${overduePct}%` }} />
            </div>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Paid</dt>
                <dd className="text-sm font-medium">{formatMoney(paid, currency)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Pending</dt>
                <dd className="text-sm font-medium">{formatMoney(pending, currency)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Overdue</dt>
                <dd className="text-sm font-medium">{formatMoney(overdue, currency)}</dd>
              </div>
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
}
