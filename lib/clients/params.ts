import { clientStatuses } from "@/types/index";

export const CLIENT_PAGE_SIZE = 15;

export const clientSorts = ["name", "company", "email", "created_at", "status"] as const;
export const clientStatusFilters = ["all", ...clientStatuses] as const;

export type ClientSort = (typeof clientSorts)[number];
export type ClientStatusFilter = (typeof clientStatusFilters)[number];

export type ClientListParams = {
  q: string;
  status: ClientStatusFilter;
  sort: ClientSort;
  dir: "asc" | "desc";
  page: number;
};

export function parseClientListParams(searchParams: {
  q?: string;
  status?: string;
  sort?: string;
  dir?: string;
  page?: string;
}): ClientListParams {
  const page = Number.parseInt(searchParams.page ?? "1", 10);

  return {
    q: (searchParams.q ?? "").trim(),
    status: clientStatusFilters.includes(searchParams.status as ClientStatusFilter)
      ? (searchParams.status as ClientStatusFilter)
      : "active",
    sort: clientSorts.includes(searchParams.sort as ClientSort)
      ? (searchParams.sort as ClientSort)
      : "name",
    dir: searchParams.dir === "desc" ? "desc" : "asc",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function clientListHref(current: ClientListParams, patch: Partial<ClientListParams> = {}) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.q) {
    params.set("q", next.q);
  }

  if (next.status !== "active") {
    params.set("status", next.status);
  }

  if (next.sort !== "name") {
    params.set("sort", next.sort);
  }

  if (next.dir !== "asc") {
    params.set("dir", next.dir);
  }

  if (next.page > 1) {
    params.set("page", String(next.page));
  }

  const query = params.toString();
  return query ? `/clients?${query}` : "/clients";
}
