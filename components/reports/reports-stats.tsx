import {
  AlertTriangle,
  CircleDollarSign,
  Clock3,
  FileCheck2,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/money";

export function ReportsStats({
  totalRevenue,
  outstanding,
  paidInvoiceCount,
  paidInvoiceAmount,
  overdueInvoiceCount,
  overdueAmount,
  currency,
}: {
  totalRevenue: number;
  outstanding: number;
  paidInvoiceCount: number;
  paidInvoiceAmount: number;
  overdueInvoiceCount: number;
  overdueAmount: number;
  currency: string;
}) {
  const items = [
    {
      title: "Total revenue",
      value: formatMoney(totalRevenue, currency),
      hint: "Payments recorded in this period",
      icon: CircleDollarSign,
    },
    {
      title: "Outstanding",
      value: formatMoney(outstanding, currency),
      hint: "Open invoice balances",
      icon: Clock3,
    },
    {
      title: "Paid invoices",
      value: String(paidInvoiceCount),
      hint: `${formatMoney(paidInvoiceAmount, currency)} marked paid`,
      icon: FileCheck2,
    },
    {
      title: "Overdue invoices",
      value: String(overdueInvoiceCount),
      hint: `${formatMoney(overdueAmount, currency)} past due`,
      icon: AlertTriangle,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title} size="sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tracking-tight">{item.value}</CardTitle>
            </div>
            <span className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <item.icon className="size-4 text-muted-foreground" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
