import { INVOICE_PAGE_SIZE, type InvoiceListParams } from "@/lib/invoices/params";
import { nextInvoiceNumber } from "@/lib/invoices/number";
import { displayInvoiceStatus, remainingBalance } from "@/lib/invoices/totals";
import { createClient } from "@/lib/supabase/server";
import { zonedDateKey } from "@/lib/utils/dates";
import { toNumber } from "@/lib/utils/money";
import { sanitizeSearch } from "@/lib/utils/text";
import type { InvoiceStatus, PaymentMethod } from "@/types/index";

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  projectId: string | null;
  projectName: string | null;
  issueDate: string;
  dueDate: string | null;
  total: number;
  amountPaid: number;
  remaining: number;
  status: InvoiceStatus;
};

export type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type InvoicePayment = {
  id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paymentDate: string;
  reference: string | null;
};

export type InvoiceFile = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  createdAt: string;
};

export type InvoiceClient = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
};

export type InvoiceDetail = {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  clientId: string;
  projectId: string | null;
  projectName: string | null;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  remaining: number;
  status: InvoiceStatus;
  notes: string | null;
  createdAt: string;
  client: InvoiceClient;
  items: InvoiceLineItem[];
  payments: InvoicePayment[];
  files: InvoiceFile[];
};

export type InvoicePageData = {
  invoices: InvoiceListItem[];
  total: number;
  page: number;
  pageCount: number;
  outstanding: number;
  overdue: number;
  paid: number;
  draftCount: number;
};

function relatedName(value: { name: string } | { name: string }[] | null | undefined) {
  if (!value) {
    return null;
  }

  const row = Array.isArray(value) ? value[0] : value;
  return row?.name ?? null;
}

function relatedClient(
  value: InvoiceClient | InvoiceClient[] | null | undefined,
): InvoiceClient | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function nextWorkspaceInvoiceNumber(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("invoices").select("invoice_number").eq("workspace_id", workspaceId);
  return nextInvoiceNumber((data ?? []).map((row) => row.invoice_number));
}

export async function getInvoicePageData(
  workspaceId: string,
  timeZone: string,
  params: InvoiceListParams,
): Promise<InvoicePageData> {
  const supabase = await createClient();
  const search = sanitizeSearch(params.q);
  const from = (params.page - 1) * INVOICE_PAGE_SIZE;
  const to = from + INVOICE_PAGE_SIZE - 1;
  const today = zonedDateKey(new Date(), timeZone);

  let listQuery = supabase
    .from("invoices")
    .select(
      "id, invoice_number, client_id, project_id, issue_date, due_date, total, amount_paid, status, clients ( name ), projects ( name )",
      { count: "exact" },
    )
    .eq("workspace_id", workspaceId)
    .order("issue_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.clientId) {
    listQuery = listQuery.eq("client_id", params.clientId);
  }

  if (params.projectId) {
    listQuery = listQuery.eq("project_id", params.projectId);
  }

  if (params.status === "overdue") {
    listQuery = listQuery
      .in("status", ["sent", "partially_paid", "overdue"])
      .not("due_date", "is", null)
      .lt("due_date", today);
  } else if (params.status === "sent") {
    listQuery = listQuery.eq("status", "sent").or(`due_date.is.null,due_date.gte.${today}`);
  } else if (params.status !== "all") {
    listQuery = listQuery.eq("status", params.status);
  }

  if (search) {
    listQuery = listQuery.ilike("invoice_number", `%${search}%`);
  }

  const [listResult, allResult] = await Promise.all([
    listQuery,
    supabase
      .from("invoices")
      .select("total, amount_paid, status, due_date")
      .eq("workspace_id", workspaceId),
  ]);

  if (listResult.error) {
    throw new Error("Could not load invoices.");
  }

  let outstanding = 0;
  let overdue = 0;
  let paid = 0;
  let draftCount = 0;

  for (const invoice of allResult.data ?? []) {
    const total = toNumber(invoice.total);
    const amountPaid = toNumber(invoice.amount_paid);
    const remaining = remainingBalance(total, amountPaid);
    const status = displayInvoiceStatus(
      { status: invoice.status, due_date: invoice.due_date, total, amountPaid },
      timeZone,
    );

    if (status === "draft") {
      draftCount += 1;
    }

    if (status === "paid") {
      paid += amountPaid;
    }

    if (status === "sent" || status === "partially_paid" || status === "overdue") {
      outstanding += remaining;
    }

    if (status === "overdue") {
      overdue += remaining;
    }
  }

  const totalCount = listResult.count ?? 0;

  return {
    invoices: (listResult.data ?? []).map((invoice) => {
      const total = toNumber(invoice.total);
      const amountPaid = toNumber(invoice.amount_paid);
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        clientId: invoice.client_id,
        clientName: relatedName(invoice.clients) ?? "Client",
        projectId: invoice.project_id,
        projectName: relatedName(invoice.projects),
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        total,
        amountPaid,
        remaining: remainingBalance(total, amountPaid),
        status: displayInvoiceStatus(
          { status: invoice.status, due_date: invoice.due_date, total, amountPaid },
          timeZone,
        ),
      };
    }),
    total: totalCount,
    page: params.page,
    pageCount: Math.max(1, Math.ceil(totalCount / INVOICE_PAGE_SIZE)),
    outstanding,
    overdue,
    paid,
    draftCount,
  };
}

export async function getInvoiceDetail(
  workspaceId: string,
  invoiceId: string,
  timeZone: string,
): Promise<InvoiceDetail | null> {
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, workspace_id, invoice_number, client_id, project_id, issue_date, due_date, subtotal, discount, tax, total, amount_paid, status, notes, created_at, clients ( id, name, company, email, phone, address, country ), projects ( name )",
    )
    .eq("workspace_id", workspaceId)
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) {
    return null;
  }

  const client = relatedClient(invoice.clients);

  if (!client) {
    return null;
  }

  const [itemsResult, paymentsResult, filesResult] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("id, description, quantity, unit_price, total")
      .eq("invoice_id", invoiceId)
      .order("id", { ascending: true }),
    supabase
      .from("payments")
      .select("id, amount, currency, payment_method, payment_date, reference")
      .eq("workspace_id", workspaceId)
      .eq("invoice_id", invoiceId)
      .order("payment_date", { ascending: false }),
    supabase
      .from("files")
      .select("id, file_name, file_size, mime_type, created_at")
      .eq("workspace_id", workspaceId)
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const total = toNumber(invoice.total);
  const amountPaid = toNumber(invoice.amount_paid);

  return {
    id: invoice.id,
    workspaceId: invoice.workspace_id,
    invoiceNumber: invoice.invoice_number,
    clientId: invoice.client_id,
    projectId: invoice.project_id,
    projectName: relatedName(invoice.projects),
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    subtotal: toNumber(invoice.subtotal),
    discount: toNumber(invoice.discount),
    tax: toNumber(invoice.tax),
    total,
    amountPaid,
    remaining: remainingBalance(total, amountPaid),
    status: displayInvoiceStatus(
      { status: invoice.status, due_date: invoice.due_date, total, amountPaid },
      timeZone,
    ),
    notes: invoice.notes,
    createdAt: invoice.created_at,
    client,
    items: (itemsResult.data ?? []).map((item) => ({
      id: item.id,
      description: item.description,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unit_price),
      total: toNumber(item.total),
    })),
    payments: (paymentsResult.data ?? []).map((payment) => ({
      id: payment.id,
      amount: toNumber(payment.amount),
      currency: payment.currency,
      method: payment.payment_method,
      paymentDate: payment.payment_date,
      reference: payment.reference,
    })),
    files: (filesResult.data ?? []).map((file) => ({
      id: file.id,
      fileName: file.file_name,
      fileSize: Number(file.file_size),
      mimeType: file.mime_type,
      createdAt: file.created_at,
    })),
  };
}
