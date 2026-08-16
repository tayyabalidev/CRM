import Link from "next/link";
import { CircleDollarSign, Wallet } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectBalance } from "@/lib/services/payments";
import { formatMoney } from "@/lib/utils/money";

function remainingLabel(remaining: number | null, currency: string) {
  if (remaining == null) {
    return "No budget set";
  }

  if (remaining < 0) {
    return `${formatMoney(Math.abs(remaining), currency)} over budget`;
  }

  return formatMoney(remaining, currency);
}

export function PaymentSummary({
  recordedTotal,
  budgetTotal,
  projectPaidTotal,
  remainingTotal,
  selectedBalance,
  projectBalances,
  currency,
  showBudget = true,
}: {
  recordedTotal: number;
  budgetTotal: number;
  projectPaidTotal: number;
  remainingTotal: number | null;
  selectedBalance: ProjectBalance | null;
  projectBalances: ProjectBalance[];
  currency: string;
  showBudget?: boolean;
}) {
  const balance = selectedBalance;
  const budget = balance ? balance.budget : budgetTotal;
  const paid = balance ? balance.paid : projectPaidTotal;
  const remaining = balance ? balance.remaining : remainingTotal;
  const displayCurrency = balance?.currency ?? currency;

  return (
    <section className="space-y-3">
      <div className={`grid gap-3 sm:grid-cols-2 ${showBudget ? "xl:grid-cols-4" : ""}`}>
        {showBudget ? (
          <Card size="sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-1">
                <CardDescription>Budget</CardDescription>
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  {budget == null ? "—" : formatMoney(budget, displayCurrency)}
                </CardTitle>
              </div>
              <span className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
                <CircleDollarSign className="size-4 text-muted-foreground" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {balance ? `${balance.projectName} budget` : "Total project budgets"}
              </p>
            </CardContent>
          </Card>
        ) : null}
        <Card size="sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardDescription>Paid</CardDescription>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {formatMoney(paid, displayCurrency)}
              </CardTitle>
            </div>
            <span className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <Wallet className="size-4 text-muted-foreground" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {balance
                ? "Recorded against this project"
                : showBudget
                  ? "Payments recorded on projects"
                  : "Payments recorded for you"}
            </p>
          </CardContent>
        </Card>
        {showBudget ? (
          <Card size="sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-1">
                <CardDescription>Remaining</CardDescription>
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  {remainingLabel(remaining, displayCurrency)}
                </CardTitle>
              </div>
              <span className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
                <CircleDollarSign className="size-4 text-muted-foreground" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Budget minus payments</p>
            </CardContent>
          </Card>
        ) : null}
        <Card size="sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardDescription>All recorded</CardDescription>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {formatMoney(recordedTotal, currency)}
              </CardTitle>
            </div>
            <span className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <Wallet className="size-4 text-muted-foreground" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {showBudget ? "Includes payments without a project" : "Every payment on your account"}
            </p>
          </CardContent>
        </Card>
      </div>

      {showBudget ? (
        <>
          <Card size="sm">
            <CardHeader>
              <CardTitle>Balance</CardTitle>
              <CardDescription>
                {balance
                  ? `${balance.projectName}: budget − paid = remaining.`
                  : "Across budgeted projects: budget − paid = remaining."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {budget == null ? "—" : formatMoney(budget, displayCurrency)} − {formatMoney(paid, displayCurrency)} ={" "}
                {remainingLabel(remaining, displayCurrency)}
              </p>
            </CardContent>
          </Card>

          {balance ? null : projectBalances.length > 0 ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Project balances</CardTitle>
                <CardDescription>Budget, paid, and remaining for each project.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {projectBalances.map((project) => (
                  <Link
                    key={project.projectId}
                    href={`/payments?project=${project.projectId}`}
                    className="space-y-1 rounded-lg border px-3 py-2 hover:bg-muted/40"
                  >
                    <p className="truncate text-sm font-medium">{project.projectName}</p>
                    <p className="truncate text-xs text-muted-foreground">{project.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.budget == null ? "No budget" : formatMoney(project.budget, project.currency)} −{" "}
                      {formatMoney(project.paid, project.currency)} = {remainingLabel(project.remaining, project.currency)}
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
