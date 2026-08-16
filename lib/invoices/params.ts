import { isUuid } from "@/lib/utils/ids";
import { invoiceStatuses } from "@/types/index";

export const INVOICE_PAGE_SIZE = 20;

export const invoiceStatusFilters = ["all", ...invoiceStatuses] as const;

export type InvoiceStatusFilter = (typeof invoiceStatusFilters)[number];

export type InvoiceListParams = {
  q: string;
  clientId: string;
  projectId: string;
  status: InvoiceStatusFilter;
  page: number;
};

export function parseInvoiceListParams(searchParams: {
  q?: string;
  client?: string;
  project?: string;
  status?: string;
  page?: string;
}): InvoiceListParams {
  const page = Number.parseInt(searchParams.page ?? "1", 10);

  return {
    q: (searchParams.q ?? "").trim(),
    clientId: searchParams.client && isUuid(searchParams.client) ? searchParams.client : "",
    projectId: searchParams.project && isUuid(searchParams.project) ? searchParams.project : "",
    status: invoiceStatusFilters.includes(searchParams.status as InvoiceStatusFilter)
      ? (searchParams.status as InvoiceStatusFilter)
      : "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function invoiceListHref(current: InvoiceListParams, patch: Partial<InvoiceListParams> = {}) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.q) {
    params.set("q", next.q);
  }

  if (next.clientId) {
    params.set("client", next.clientId);
  }

  if (next.projectId) {
    params.set("project", next.projectId);
  }

  if (next.status !== "all") {
    params.set("status", next.status);
  }

  if (next.page > 1) {
    params.set("page", String(next.page));
  }

  const query = params.toString();
  return query ? `/invoices?${query}` : "/invoices";
}
