import { isUuid } from "@/lib/utils/ids";
import { paymentMethods } from "@/types/index";

export const PAYMENT_PAGE_SIZE = 20;

export const paymentDateFilters = ["all", "today", "week", "month", "year"] as const;
export const paymentMethodFilters = ["all", ...paymentMethods] as const;

export type PaymentDateFilter = (typeof paymentDateFilters)[number];
export type PaymentMethodFilter = (typeof paymentMethodFilters)[number];

export type PaymentListParams = {
  q: string;
  clientId: string;
  projectId: string;
  method: PaymentMethodFilter;
  date: PaymentDateFilter;
  page: number;
};

export function parsePaymentListParams(searchParams: {
  q?: string;
  client?: string;
  project?: string;
  method?: string;
  date?: string;
  page?: string;
}): PaymentListParams {
  const page = Number.parseInt(searchParams.page ?? "1", 10);

  return {
    q: (searchParams.q ?? "").trim(),
    clientId: searchParams.client && isUuid(searchParams.client) ? searchParams.client : "",
    projectId: searchParams.project && isUuid(searchParams.project) ? searchParams.project : "",
    method: paymentMethodFilters.includes(searchParams.method as PaymentMethodFilter)
      ? (searchParams.method as PaymentMethodFilter)
      : "all",
    date: paymentDateFilters.includes(searchParams.date as PaymentDateFilter)
      ? (searchParams.date as PaymentDateFilter)
      : "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function paymentListHref(current: PaymentListParams, patch: Partial<PaymentListParams> = {}) {
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

  if (next.method !== "all") {
    params.set("method", next.method);
  }

  if (next.date !== "all") {
    params.set("date", next.date);
  }

  if (next.page > 1) {
    params.set("page", String(next.page));
  }

  const query = params.toString();
  return query ? `/payments?${query}` : "/payments";
}
