import { createClient } from "@/lib/supabase/server";
import { throwUserError } from "@/lib/logging/safe-error";
import type { InvoiceStatus } from "@/types/index";
import {
  type DashboardRange,
  eachMonthKeys,
  formatMonthLabel,
  getRangeStartKey,
  zonedDateKey,
} from "@/lib/utils/dates";
import { entrySeconds } from "@/lib/services/time";
import { toNumber } from "@/lib/utils/money";

export type ReportRevenuePoint = {
  key: string;
  label: string;
  amount: number;
};

export type ReportClientRevenue = {
  clientId: string;
  clientName: string;
  amount: number;
};

export type ReportProjectProfit = {
  projectId: string;
  projectName: string;
  clientName: string;
  budget: number | null;
  revenue: number;
  laborCost: number;
  profit: number;
  trackedSeconds: number;
  billableSeconds: number;
};

export type ReportsData = {
  totalRevenue: number;
  outstanding: number;
  paidInvoiceCount: number;
  paidInvoiceAmount: number;
  overdueInvoiceCount: number;
  overdueAmount: number;
  trackedSeconds: number;
  billableSeconds: number;
  revenueByMonth: ReportRevenuePoint[];
  revenueByClient: ReportClientRevenue[];
  projectProfitability: ReportProjectProfit[];
};

type InvoiceRow = {
  total: string;
  amount_paid: string;
  status: InvoiceStatus;
  due_date: string | null;
};

function remainingBalance(invoice: InvoiceRow) {
  return Math.max(toNumber(invoice.total) - toNumber(invoice.amount_paid), 0);
}

function isOverdueInvoice(invoice: InvoiceRow, todayKey: string) {
  if (invoice.status === "paid" || invoice.status === "cancelled" || invoice.status === "draft") {
    return false;
  }

  if (invoice.status === "overdue") {
    return remainingBalance(invoice) > 0;
  }

  return Boolean(invoice.due_date && invoice.due_date < todayKey && remainingBalance(invoice) > 0);
}

function relatedName(value: { name: string } | { name: string }[] | null | undefined) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0]?.name ?? null) : value.name;
}

export async function getReportsData(
  workspaceId: string,
  range: DashboardRange,
  timeZone: string,
): Promise<ReportsData> {
  const supabase = await createClient();
  const now = new Date();
  const todayKey = zonedDateKey(now, timeZone);
  const rangeStartKey = getRangeStartKey(range, timeZone, now);
  const rangeStartIso = `${rangeStartKey}T00:00:00.000Z`;

  const [paymentsResult, invoicesResult, projectsResult, timeResult] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, payment_date, client_id, project_id, clients ( name )")
      .eq("workspace_id", workspaceId)
      .gte("payment_date", rangeStartKey)
      .lte("payment_date", todayKey),
    supabase
      .from("invoices")
      .select("total, amount_paid, status, due_date")
      .eq("workspace_id", workspaceId)
      .neq("status", "cancelled"),
    supabase
      .from("projects")
      .select("id, name, budget, clients ( name )")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true })
      .limit(200),
    supabase
      .from("time_entries")
      .select("project_id, duration_seconds, started_at, ended_at, billable, hourly_rate")
      .eq("workspace_id", workspaceId)
      .gte("started_at", rangeStartIso)
      .not("ended_at", "is", null),
  ]);

  if (paymentsResult.error || invoicesResult.error || projectsResult.error || timeResult.error) {
    throwUserError(
      "reports.load",
      paymentsResult.error ?? invoicesResult.error ?? projectsResult.error ?? timeResult.error,
      "Could not load reports.",
    );
  }

  const payments = paymentsResult.data ?? [];
  const invoices = (invoicesResult.data ?? []) as InvoiceRow[];
  const projects = projectsResult.data ?? [];
  const timeEntries = timeResult.data ?? [];
  const nowMs = now.getTime();

  const totalRevenue = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  let outstanding = 0;
  let overdueAmount = 0;
  let overdueInvoiceCount = 0;
  let paidInvoiceCount = 0;
  let paidInvoiceAmount = 0;

  for (const invoice of invoices) {
    if (invoice.status === "paid") {
      paidInvoiceCount += 1;
      paidInvoiceAmount += toNumber(invoice.total);
      continue;
    }

    if (invoice.status === "cancelled" || invoice.status === "draft") {
      continue;
    }

    const remaining = remainingBalance(invoice);

    if (remaining <= 0) {
      continue;
    }

    outstanding += remaining;

    if (isOverdueInvoice(invoice, todayKey)) {
      overdueAmount += remaining;
      overdueInvoiceCount += 1;
    }
  }

  const monthBuckets = new Map<string, number>();
  const clientBuckets = new Map<string, ReportClientRevenue>();
  const projectRevenue = new Map<string, number>();

  for (const payment of payments) {
    const amount = toNumber(payment.amount);
    const monthKey = payment.payment_date.slice(0, 7);
    monthBuckets.set(monthKey, (monthBuckets.get(monthKey) ?? 0) + amount);

    const clientId = payment.client_id;
    const clientName = relatedName(payment.clients) ?? "Unknown client";
    const existingClient = clientBuckets.get(clientId);

    if (existingClient) {
      existingClient.amount += amount;
    } else {
      clientBuckets.set(clientId, { clientId, clientName, amount });
    }

    if (payment.project_id) {
      projectRevenue.set(
        payment.project_id,
        (projectRevenue.get(payment.project_id) ?? 0) + amount,
      );
    }
  }

  const revenueByMonth: ReportRevenuePoint[] = eachMonthKeys(rangeStartKey, todayKey).map((key) => ({
    key,
    amount: monthBuckets.get(key) ?? 0,
    label: formatMonthLabel(`${key}-01T12:00:00Z`, timeZone),
  }));

  const revenueByClient = [...clientBuckets.values()].sort((a, b) => b.amount - a.amount).slice(0, 12);

  let trackedSeconds = 0;
  let billableSeconds = 0;
  const projectHours = new Map<
    string,
    { trackedSeconds: number; billableSeconds: number; laborCost: number }
  >();

  for (const entry of timeEntries) {
    const startedKey = zonedDateKey(entry.started_at, timeZone);

    if (startedKey < rangeStartKey || startedKey > todayKey) {
      continue;
    }

    const seconds = entrySeconds(entry, nowMs);
    trackedSeconds += seconds;

    if (entry.billable) {
      billableSeconds += seconds;
    }

    const current = projectHours.get(entry.project_id) ?? {
      trackedSeconds: 0,
      billableSeconds: 0,
      laborCost: 0,
    };
    current.trackedSeconds += seconds;

    if (entry.billable) {
      current.billableSeconds += seconds;
      const rate = entry.hourly_rate == null ? 0 : toNumber(entry.hourly_rate);
      current.laborCost += (seconds / 3600) * rate;
    }

    projectHours.set(entry.project_id, current);
  }

  const projectProfitability: ReportProjectProfit[] = projects
    .map((project) => {
      const hours = projectHours.get(project.id) ?? {
        trackedSeconds: 0,
        billableSeconds: 0,
        laborCost: 0,
      };
      const revenue = projectRevenue.get(project.id) ?? 0;
      const budget = project.budget == null ? null : toNumber(project.budget);
      const profit = revenue - hours.laborCost;

      return {
        projectId: project.id,
        projectName: project.name,
        clientName: relatedName(project.clients) ?? "No client",
        budget,
        revenue,
        laborCost: hours.laborCost,
        profit,
        trackedSeconds: hours.trackedSeconds,
        billableSeconds: hours.billableSeconds,
      };
    })
    .filter((project) => project.revenue > 0 || project.trackedSeconds > 0 || project.budget != null)
    .sort((a, b) => b.profit - a.profit || b.revenue - a.revenue)
    .slice(0, 20);

  return {
    totalRevenue,
    outstanding,
    paidInvoiceCount,
    paidInvoiceAmount,
    overdueInvoiceCount,
    overdueAmount,
    trackedSeconds,
    billableSeconds,
    revenueByMonth,
    revenueByClient,
    projectProfitability,
  };
}
