import { isUuid } from "@/lib/utils/ids";

export const TIME_PAGE_SIZE = 20;

export type TimeListParams = {
  q: string;
  projectId: string;
  billable: "all" | "yes" | "no";
  page: number;
};

export function parseTimeListParams(searchParams: {
  q?: string;
  project?: string;
  billable?: string;
  page?: string;
}): TimeListParams {
  const page = Number.parseInt(searchParams.page ?? "1", 10);

  return {
    q: (searchParams.q ?? "").trim(),
    projectId: searchParams.project && isUuid(searchParams.project) ? searchParams.project : "",
    billable: searchParams.billable === "yes" || searchParams.billable === "no" ? searchParams.billable : "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function timeListHref(current: TimeListParams, patch: Partial<TimeListParams> = {}) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.q) {
    params.set("q", next.q);
  }

  if (next.projectId) {
    params.set("project", next.projectId);
  }

  if (next.billable !== "all") {
    params.set("billable", next.billable);
  }

  if (next.page > 1) {
    params.set("page", String(next.page));
  }

  const query = params.toString();
  return query ? `/time?${query}` : "/time";
}
