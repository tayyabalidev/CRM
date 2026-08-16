import type { SupabaseClient } from "@supabase/supabase-js";

import { PAYMENT_PAGE_SIZE, type PaymentListParams } from "@/lib/payments/params";
import { createClient } from "@/lib/supabase/server";
import { startOfWeekKey, zonedDateKey } from "@/lib/utils/dates";
import { toNumber } from "@/lib/utils/money";
import { sanitizeSearch } from "@/lib/utils/text";
import type { Database } from "@/types/database";
import type { InvoiceStatus, PaymentMethod } from "@/types/index";

export type PaymentListItem = {
  id: string;
  clientId: string;
  clientName: string;
  projectId: string | null;
  projectName: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
};

export type ProjectBalance = {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  budget: number | null;
  paid: number;
  remaining: number | null;
  currency: string;
};

export type PaymentPageData = {
  payments: PaymentListItem[];
  total: number;
  page: number;
  pageCount: number;
  recordedTotal: number;
  budgetTotal: number;
  projectPaidTotal: number;
  remainingTotal: number | null;
  selectedBalance: ProjectBalance | null;
  projectBalances: ProjectBalance[];
};

function relatedName(value: { name: string } | { name: string }[] | null | undefined) {
  if (!value) {
    return null;
  }

  const row = Array.isArray(value) ? value[0] : value;
  return row?.name ?? null;
}

function relatedInvoiceNumber(
  value: { invoice_number: string } | { invoice_number: string }[] | null | undefined,
) {
  if (!value) {
    return null;
  }

  const row = Array.isArray(value) ? value[0] : value;
  return row?.invoice_number ?? null;
}

function dateStartKey(filter: PaymentListParams["date"], timeZone: string) {
  const today = zonedDateKey(new Date(), timeZone);

  switch (filter) {
    case "today":
      return today;
    case "week":
      return startOfWeekKey(timeZone);
    case "month":
      return `${today.slice(0, 7)}-01`;
    case "year":
      return `${today.slice(0, 4)}-01-01`;
    default:
      return null;
  }
}

export async function listPaymentClients(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  return data ?? [];
}

export async function listPaymentProjects(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  return data ?? [];
}

export async function listInvoiceOptions(workspaceId: string, includeId?: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_number, client_id, project_id, status, total, amount_paid")
    .eq("workspace_id", workspaceId)
    .order("issue_date", { ascending: false });

  return (data ?? [])
    .filter((invoice) => invoice.status !== "cancelled" || invoice.id === includeId)
    .map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      clientId: invoice.client_id,
      projectId: invoice.project_id,
      status: invoice.status,
      total: toNumber(invoice.total),
      amountPaid: toNumber(invoice.amount_paid),
    }));
}

export async function syncInvoiceFromPayments(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  invoiceId: string,
  timeZone: string,
) {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, status, due_date")
    .eq("id", invoiceId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!invoice) {
    return;
  }

  const { data: rows } = await supabase
    .from("payments")
    .select("amount")
    .eq("workspace_id", workspaceId)
    .eq("invoice_id", invoiceId);

  const amountPaid = (rows ?? []).reduce((sum, row) => sum + toNumber(row.amount), 0);
  const total = toNumber(invoice.total);
  let status: InvoiceStatus = invoice.status;

  if (status !== "cancelled" && status !== "draft") {
    if (total > 0 && amountPaid >= total) {
      status = "paid";
    } else if (amountPaid > 0) {
      status = "partially_paid";
    } else {
      const today = zonedDateKey(new Date(), timeZone);
      status = invoice.due_date && invoice.due_date < today ? "overdue" : "sent";
    }
  }

  await supabase
    .from("invoices")
    .update({ amount_paid: amountPaid.toFixed(2), status })
    .eq("id", invoiceId)
    .eq("workspace_id", workspaceId);

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    previousStatus: invoice.status,
    status,
  };
}

export async function getPaymentPageData(
  workspaceId: string,
  timeZone: string,
  params: PaymentListParams,
): Promise<PaymentPageData> {
  const supabase = await createClient();
  const search = sanitizeSearch(params.q);
  const from = (params.page - 1) * PAYMENT_PAGE_SIZE;
  const to = from + PAYMENT_PAGE_SIZE - 1;
  const startKey = dateStartKey(params.date, timeZone);

  let listQuery = supabase
    .from("payments")
    .select(
      "id, client_id, project_id, invoice_id, amount, currency, payment_method, payment_date, reference, notes, clients ( name ), projects ( name ), invoices ( invoice_number )",
      { count: "exact" },
    )
    .eq("workspace_id", workspaceId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.clientId) {
    listQuery = listQuery.eq("client_id", params.clientId);
  }

  if (params.projectId) {
    listQuery = listQuery.eq("project_id", params.projectId);
  }

  if (params.method !== "all") {
    listQuery = listQuery.eq("payment_method", params.method);
  }

  if (params.date === "today" && startKey) {
    listQuery = listQuery.eq("payment_date", startKey);
  } else if (startKey) {
    listQuery = listQuery.gte("payment_date", startKey);
  }

  if (search) {
    listQuery = listQuery.or(`reference.ilike.%${search}%,notes.ilike.%${search}%`);
  }

  const [listResult, allPaymentsResult, projectsResult] = await Promise.all([
    listQuery,
    supabase.from("payments").select("amount, project_id, client_id").eq("workspace_id", workspaceId),
    supabase
      .from("projects")
      .select("id, name, budget, currency, client_id, clients ( name )")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true }),
  ]);

  if (listResult.error) {
    throw new Error("Could not load payments.");
  }

  const paidByProject = new Map<string, number>();
  let recordedTotal = 0;

  for (const payment of allPaymentsResult.data ?? []) {
    const amount = toNumber(payment.amount);

    if (payment.project_id) {
      paidByProject.set(payment.project_id, (paidByProject.get(payment.project_id) ?? 0) + amount);
    }

    if (params.clientId && payment.client_id !== params.clientId) {
      continue;
    }

    if (params.projectId && payment.project_id !== params.projectId) {
      continue;
    }

    recordedTotal += amount;
  }

  const allProjectBalances: ProjectBalance[] = (projectsResult.data ?? []).map((project) => {
    const budget = project.budget == null ? null : toNumber(project.budget);
    const paid = paidByProject.get(project.id) ?? 0;
    return {
      projectId: project.id,
      projectName: project.name,
      clientId: project.client_id,
      clientName: relatedName(project.clients) ?? "Client",
      budget,
      paid,
      remaining: budget == null ? null : budget - paid,
      currency: project.currency,
    };
  });

  const projectBalances = allProjectBalances
    .filter((project) => {
      if (params.clientId && project.clientId !== params.clientId) {
        return false;
      }

      if (params.projectId && project.projectId !== params.projectId) {
        return false;
      }

      return project.budget != null || project.paid > 0;
    })
    .sort((a, b) => Math.abs(b.remaining ?? b.paid) - Math.abs(a.remaining ?? a.paid));

  const scopedBalances = allProjectBalances.filter((project) => {
    if (params.clientId && project.clientId !== params.clientId) {
      return false;
    }

    if (params.projectId && project.projectId !== params.projectId) {
      return false;
    }

    return true;
  });
  const budgeted = scopedBalances.filter((project) => project.budget != null);
  const budgetTotal = budgeted.reduce((sum, project) => sum + (project.budget ?? 0), 0);
  const projectPaidTotal = scopedBalances.reduce((sum, project) => sum + project.paid, 0);
  const remainingTotal = budgeted.length === 0 ? null : budgeted.reduce((sum, project) => sum + (project.remaining ?? 0), 0);
  const total = listResult.count ?? 0;

  return {
    payments: (listResult.data ?? []).map((payment) => ({
      id: payment.id,
      clientId: payment.client_id,
      clientName: relatedName(payment.clients) ?? "Client",
      projectId: payment.project_id,
      projectName: relatedName(payment.projects),
      invoiceId: payment.invoice_id,
      invoiceNumber: relatedInvoiceNumber(payment.invoices),
      amount: toNumber(payment.amount),
      currency: payment.currency,
      method: payment.payment_method,
      paymentDate: payment.payment_date,
      reference: payment.reference,
      notes: payment.notes,
    })),
    total,
    page: params.page,
    pageCount: Math.max(1, Math.ceil(total / PAYMENT_PAGE_SIZE)),
    recordedTotal,
    budgetTotal,
    projectPaidTotal,
    remainingTotal,
    selectedBalance: params.projectId
      ? (allProjectBalances.find((project) => project.projectId === params.projectId) ?? null)
      : null,
    projectBalances: projectBalances.slice(0, 8),
  };
}
