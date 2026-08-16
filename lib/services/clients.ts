import { CLIENT_PAGE_SIZE, type ClientListParams } from "@/lib/clients/params";
import { mapActivityRow, type ActivityItem } from "@/lib/services/activity";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/utils/text";
import { toNumber } from "@/lib/utils/money";
import { OPTION_LIST_LIMIT, ensureIncludedOption } from "@/lib/utils/options";
import { zonedDateKey } from "@/lib/utils/dates";
import type { InvoiceStatus, NoteVisibility, Priority, ProjectStatus, TaskStatus } from "@/types/index";
import type { Tables } from "@/types/database";

export type ClientRecord = Tables<"clients">;

export type ClientListItem = ClientRecord;

export type ClientListResult = {
  clients: ClientListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ClientProject = {
  id: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  dueDate: string | null;
};

export type ClientTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  projectName: string | null;
};

export type ClientInvoice = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  total: number;
  dueDate: string | null;
};

export type ClientPayment = {
  id: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method: string;
};

export type ClientFile = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  createdAt: string;
};

export type ClientNote = {
  id: string;
  title: string;
  content: string | null;
  visibility: NoteVisibility;
  createdAt: string;
  createdBy: string | null;
  projectId: string | null;
};

export type ClientActivity = ActivityItem;

export type ClientDetail = {
  client: ClientRecord;
  totalRevenue: number;
  outstanding: number;
  projectCount: number;
  taskCount: number;
  invoiceCount: number;
  paymentCount: number;
  projects: ClientProject[];
  tasks: ClientTask[];
  invoices: ClientInvoice[];
  payments: ClientPayment[];
  files: ClientFile[];
  notes: ClientNote[];
  activity: ClientActivity[];
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

export async function listClients(
  workspaceId: string,
  params: ClientListParams,
): Promise<ClientListResult> {
  const supabase = await createClient();
  const from = (params.page - 1) * CLIENT_PAGE_SIZE;
  const to = from + CLIENT_PAGE_SIZE - 1;
  const search = sanitizeSearch(params.q);

  let query = supabase
    .from("clients")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .order(params.sort, { ascending: params.dir === "asc", nullsFirst: false })
    .range(from, to);

  if (params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new Error("Could not load clients.");
  }

  const total = count ?? 0;

  return {
    clients: data ?? [],
    total,
    page: params.page,
    pageSize: CLIENT_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / CLIENT_PAGE_SIZE)),
  };
}

export async function listClientOptions(workspaceId: string, includeId?: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, status")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true })
    .limit(OPTION_LIST_LIMIT);

  const rows = (data ?? []).filter((client) => client.status !== "archived" || client.id === includeId);

  return ensureIncludedOption(rows, includeId, async (id) => {
    const { data: row } = await supabase
      .from("clients")
      .select("id, name, status")
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .maybeSingle();

    return row;
  });
}

export async function getClientDetail(
  workspaceId: string,
  clientId: string,
  timeZone: string,
): Promise<ClientDetail | null> {
  const supabase = await createClient();
  const todayKey = zonedDateKey(new Date(), timeZone);

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", clientId)
    .maybeSingle();

  if (!client) {
    return null;
  }

  const [
    projectsResult,
    invoicesResult,
    paymentsResult,
    filesResult,
    notesResult,
    activityResult,
    allInvoicesResult,
    projectCountResult,
    invoiceCountResult,
    paymentCountResult,
    taskCountResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, progress, due_date")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, total, due_date")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .order("issue_date", { ascending: false })
      .limit(8),
    supabase
      .from("payments")
      .select("id, amount, currency, payment_date, payment_method")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .order("payment_date", { ascending: false })
      .limit(8),
    supabase
      .from("files")
      .select("id, file_name, file_size, mime_type, created_at")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("notes")
      .select("id, title, content, visibility, created_at, created_by, project_id")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("activity_logs")
      .select("id, action, entity_type, entity_id, metadata, created_at")
      .eq("workspace_id", workspaceId)
      .eq("entity_type", "client")
      .eq("entity_id", clientId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("invoices")
      .select("total, amount_paid, status, due_date")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId),
  ]);

  const projects = projectsResult.data ?? [];
  const projectIds = projects.map((project) => project.id);

  let tasksQuery = supabase
    .from("tasks")
    .select("id, title, status, priority, due_date, client_id, project_id, projects ( name )")
    .eq("workspace_id", workspaceId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(8);

  if (projectIds.length > 0) {
    tasksQuery = tasksQuery.or(`client_id.eq.${clientId},project_id.in.(${projectIds.join(",")})`);
  } else {
    tasksQuery = tasksQuery.eq("client_id", clientId);
  }

  const { data: tasks } = await tasksQuery;

  const { data: paymentTotals } = await supabase
    .from("payments")
    .select("amount")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId);

  const totalRevenue = (paymentTotals ?? []).reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  let outstanding = 0;
  for (const invoice of (allInvoicesResult.data ?? []) as InvoiceRow[]) {
    if (isOverdueInvoice(invoice, todayKey) || invoice.status === "sent" || invoice.status === "partially_paid") {
      outstanding += remainingBalance(invoice);
    }
  }

  return {
    client,
    totalRevenue,
    outstanding,
    projectCount: projectCountResult.count ?? 0,
    taskCount: taskCountResult.count ?? 0,
    invoiceCount: invoiceCountResult.count ?? 0,
    paymentCount: paymentCountResult.count ?? 0,
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      progress: project.progress ?? 0,
      dueDate: project.due_date,
    })),
    tasks: (tasks ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date,
      projectName: relatedName(task.projects),
    })),
    invoices: (invoicesResult.data ?? []).map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      status: invoice.status,
      total: toNumber(invoice.total),
      dueDate: invoice.due_date,
    })),
    payments: (paymentsResult.data ?? []).map((payment) => ({
      id: payment.id,
      amount: toNumber(payment.amount),
      currency: payment.currency,
      paymentDate: payment.payment_date,
      method: payment.payment_method,
    })),
    files: (filesResult.data ?? []).map((file) => ({
      id: file.id,
      fileName: file.file_name,
      fileSize: Number(file.file_size),
      mimeType: file.mime_type,
      createdAt: file.created_at,
    })),
    notes: (notesResult.data ?? []).map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      visibility: note.visibility,
      createdAt: note.created_at,
      createdBy: note.created_by,
      projectId: note.project_id,
    })),
    activity: (activityResult.data ?? []).map(mapActivityRow),
  };
}
