import { CircleDollarSign, FileText, Wallet } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInvoiceMoney } from "@/lib/invoices/totals";

export function InvoiceSummary({
  outstanding,
  overdue,
  paid,
  draftCount,
  currency,
  showDrafts = true,
}: {
  outstanding: number;
  overdue: number;
  paid: number;
  draftCount: number;
  currency: string;
  showDrafts?: boolean;
}) {
  const items = [
    {
      title: "Outstanding",
      value: formatInvoiceMoney(outstanding, currency),
      hint: "Unpaid sent invoices",
      icon: CircleDollarSign,
    },
    {
      title: "Overdue",
      value: formatInvoiceMoney(overdue, currency),
      hint: "Past due remaining balance",
      icon: CircleDollarSign,
    },
    {
      title: "Paid",
      value: formatInvoiceMoney(paid, currency),
      hint: "Collected on paid invoices",
      icon: Wallet,
    },
    ...(showDrafts
      ? [
          {
            title: "Drafts",
            value: String(draftCount),
            hint: "Invoices not yet sent",
            icon: FileText,
          },
        ]
      : []),
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
