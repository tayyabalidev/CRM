import {
  CircleDollarSign,
  Clock3,
  FolderKanban,
  ListTodo,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/money";

export function DashboardStats({
  totalRevenue,
  outstanding,
  activeProjects,
  pendingTasks,
  currency,
  portal = false,
}: {
  totalRevenue: number;
  outstanding: number;
  activeProjects: number;
  pendingTasks: number;
  currency: string;
  portal?: boolean;
}) {
  const items = [
    {
      title: portal ? "Paid to date" : "Total revenue",
      value: formatMoney(totalRevenue, currency),
      hint: portal ? "Payments recorded for you" : "All recorded payments",
      icon: CircleDollarSign,
    },
    {
      title: portal ? "Amount due" : "Outstanding",
      value: formatMoney(outstanding, currency),
      hint: portal ? "Unpaid invoices sent to you" : "Unpaid and overdue invoices",
      icon: Clock3,
    },
    {
      title: portal ? "Your projects" : "Active projects",
      value: String(activeProjects),
      hint: portal ? "Projects currently in progress" : "Projects currently in progress",
      icon: FolderKanban,
    },
    {
      title: portal ? "Open tasks" : "Pending tasks",
      value: String(pendingTasks),
      hint: portal ? "Work still open on your projects" : "Work still open",
      icon: ListTodo,
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
