import { activityHref } from "@/lib/activity/params";
import { mapActivityRow, type ActivityItem } from "@/lib/services/activity";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceStatus, Priority, ProjectStatus, TaskStatus } from "@/types/index";
import {
  type DashboardRange,
  eachDateKeys,
  eachMonthKeys,
  formatDayLabel,
  formatMonthLabel,
  getRangeStartKey,
  isSameZonedDay,
  zonedDateKey,
} from "@/lib/utils/dates";
import { formatMoney, toNumber } from "@/lib/utils/money";

export type RevenuePoint = {
  key: string;
  label: string;
  amount: number;
};

export type DashboardProject = {
  id: string;
  name: string;
  clientName: string;
  progress: number;
  dueDate: string | null;
  status: ProjectStatus;
};

export type DashboardTask = {
  id: string;
  title: string;
  projectName: string | null;
  priority: Priority;
  dueDate: string | null;
  status: TaskStatus;
};

export type DashboardDeadline = {
  id: string;
  title: string;
  type: "project" | "task";
  dueDate: string;
};

export type DashboardActivity = ActivityItem;

export type DashboardData = {
  totalRevenue: number;
  outstanding: number;
  activeProjects: number;
  pendingTasks: number;
  paid: number;
  pending: number;
  overdue: number;
  revenueSeries: RevenuePoint[];
  projects: DashboardProject[];
  todayTasks: DashboardTask[];
  deadlines: DashboardDeadline[];
  activity: DashboardActivity[];
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

function isOpenInvoice(status: InvoiceStatus) {
  return status === "sent" || status === "partially_paid" || status === "overdue";
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

export async function getDashboardData(
  workspaceId: string,
  range: DashboardRange,
  timeZone: string,
): Promise<DashboardData> {
  const supabase = await createClient();
  const now = new Date();
  const todayKey = zonedDateKey(now, timeZone);
  const rangeStartKey = getRangeStartKey(range, timeZone, now);
  const bucketByMonth = range === "3m" || range === "6m" || range === "1y";

  const [
    paymentsLifetimeResult,
    paymentsRangeResult,
    invoicesResult,
    activeProjectsCount,
    pendingTasksCount,
    projectsResult,
    openTasksResult,
    upcomingProjectsResult,
    recentClients,
    recentProjects,
    recentPayments,
    recentInvoices,
    recentCompletedTasks,
    activityLogs,
  ] = await Promise.all([
    supabase.from("payments").select("amount").eq("workspace_id", workspaceId),
    supabase
      .from("payments")
      .select("amount, payment_date")
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
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("status", "completed")
      .eq("kind", "task"),
    supabase
      .from("projects")
      .select("id, name, progress, due_date, status, clients ( name )")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(6),
    supabase
      .from("tasks")
      .select("id, title, priority, due_date, status, projects ( name )")
      .eq("workspace_id", workspaceId)
      .neq("status", "completed")
      .eq("kind", "task")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })
      .limit(40),
    supabase
      .from("projects")
      .select("id, name, due_date")
      .eq("workspace_id", workspaceId)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })
      .limit(20),
    supabase
      .from("clients")
      .select("id, name, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("projects")
      .select("id, name, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("payments")
      .select("id, amount, currency, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("invoices")
      .select("id, invoice_number, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("tasks")
      .select("id, title, completed_at, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "completed")
      .eq("kind", "task")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(5),
    supabase
      .from("activity_logs")
      .select("id, action, entity_type, entity_id, metadata, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const paymentsLifetime = paymentsLifetimeResult.data ?? [];
  const payments = paymentsRangeResult.data ?? [];
  const invoices = (invoicesResult.data ?? []) as InvoiceRow[];

  const totalRevenue = paymentsLifetime.reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  let pending = 0;
  let overdue = 0;

  for (const invoice of invoices) {
    const remaining = remainingBalance(invoice);

    if (invoice.status === "paid" || invoice.status === "cancelled" || invoice.status === "draft") {
      continue;
    }

    if (isOverdueInvoice(invoice, todayKey)) {
      overdue += remaining;
    } else if (isOpenInvoice(invoice.status)) {
      pending += remaining;
    }
  }

  const paid = totalRevenue;

  const outstanding = pending + overdue;
  const buckets = new Map<string, number>();

  for (const payment of payments) {
    const key = bucketByMonth ? payment.payment_date.slice(0, 7) : payment.payment_date;
    buckets.set(key, (buckets.get(key) ?? 0) + toNumber(payment.amount));
  }

  const seriesKeys = bucketByMonth
    ? eachMonthKeys(rangeStartKey, todayKey)
    : eachDateKeys(rangeStartKey, todayKey);

  const revenueSeries: RevenuePoint[] = seriesKeys.map((key) => ({
    key,
    amount: buckets.get(key) ?? 0,
    label: bucketByMonth
      ? formatMonthLabel(`${key}-01T12:00:00Z`, timeZone)
      : formatDayLabel(`${key}T12:00:00Z`, timeZone),
  }));

  const projects: DashboardProject[] = (projectsResult.data ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    clientName: relatedName(project.clients) ?? "No client",
    progress: project.progress ?? 0,
    dueDate: project.due_date,
    status: project.status,
  }));

  const openTasks = openTasksResult.data ?? [];

  const todayTasks: DashboardTask[] = openTasks
    .filter((task) => task.due_date && isSameZonedDay(task.due_date, timeZone, now))
    .slice(0, 8)
    .map((task) => ({
      id: task.id,
      title: task.title,
      projectName: relatedName(task.projects),
      priority: task.priority,
      dueDate: task.due_date,
      status: task.status,
    }));

  const deadlines: DashboardDeadline[] = [
    ...(upcomingProjectsResult.data ?? []).flatMap((project) =>
      project.due_date && project.due_date >= todayKey
        ? [{ id: `project-${project.id}`, title: project.name, type: "project" as const, dueDate: project.due_date }]
        : [],
    ),
    ...openTasks.flatMap((task) =>
      task.due_date && !isSameZonedDay(task.due_date, timeZone, now) && zonedDateKey(task.due_date, timeZone) > todayKey
        ? [{ id: `task-${task.id}`, title: task.title, type: "task" as const, dueDate: task.due_date }]
        : [],
    ),
  ]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);

  const activity: DashboardActivity[] = (activityLogs.data ?? []).map(mapActivityRow);

  if (activity.length === 0) {
    activity.push(
      ...(recentClients.data ?? []).map((client) => ({
        id: `client-${client.id}`,
        createdAt: client.created_at,
        entityType: "client",
        entityId: client.id,
        action: "created",
        href: activityHref("client", client.id),
        message: `${client.name} was added as a client.`,
      })),
      ...(recentProjects.data ?? []).map((project) => ({
        id: `project-${project.id}`,
        createdAt: project.created_at,
        entityType: "project",
        entityId: project.id,
        action: "created",
        href: activityHref("project", project.id),
        message: `Project “${project.name}” was created.`,
      })),
      ...(recentPayments.data ?? []).map((payment) => ({
        id: `payment-${payment.id}`,
        createdAt: payment.created_at,
        entityType: "payment",
        entityId: payment.id,
        action: "created",
        href: activityHref("payment", payment.id),
        message: `Payment of ${formatMoney(toNumber(payment.amount), payment.currency)} was recorded.`,
      })),
      ...(recentInvoices.data ?? []).map((invoice) => ({
        id: `invoice-${invoice.id}`,
        createdAt: invoice.created_at,
        entityType: "invoice",
        entityId: invoice.id,
        action: "created",
        href: activityHref("invoice", invoice.id),
        message: `Invoice ${invoice.invoice_number} was created.`,
      })),
      ...(recentCompletedTasks.data ?? []).map((task) => ({
        id: `task-${task.id}`,
        createdAt: task.completed_at ?? task.updated_at,
        entityType: "task",
        entityId: task.id,
        action: "completed",
        href: activityHref("task", task.id),
        message: `“${task.title}” was marked as completed.`,
      })),
    );

    activity.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return {
    totalRevenue,
    outstanding,
    activeProjects: activeProjectsCount.count ?? 0,
    pendingTasks: pendingTasksCount.count ?? 0,
    paid,
    pending,
    overdue,
    revenueSeries,
    projects,
    todayTasks,
    deadlines,
    activity: activity.slice(0, 8),
  };
}
