import { isUuid } from "@/lib/utils/ids";

export const ACTIVITY_PAGE_SIZE = 30;

export const activityEntityFilters = [
  "all",
  "client",
  "project",
  "task",
  "invoice",
  "payment",
  "file",
  "note",
  "time_entry",
] as const;

export type ActivityEntityFilter = (typeof activityEntityFilters)[number];

export const activityEntityLabels: Record<ActivityEntityFilter, string> = {
  all: "All types",
  client: "Clients",
  project: "Projects",
  task: "Tasks",
  invoice: "Invoices",
  payment: "Payments",
  file: "Files",
  note: "Notes",
  time_entry: "Time",
};

export type ActivityListParams = {
  q: string;
  entityType: ActivityEntityFilter;
  page: number;
};

export function parseActivityListParams(searchParams: {
  q?: string;
  type?: string;
  page?: string;
}): ActivityListParams {
  const page = Number.parseInt(searchParams.page ?? "1", 10);
  const entityType = activityEntityFilters.includes(searchParams.type as ActivityEntityFilter)
    ? (searchParams.type as ActivityEntityFilter)
    : "all";

  return {
    q: (searchParams.q ?? "").trim(),
    entityType,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function activityListHref(current: ActivityListParams, patch: Partial<ActivityListParams> = {}) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.q) {
    params.set("q", next.q);
  }

  if (next.entityType !== "all") {
    params.set("type", next.entityType);
  }

  if (next.page > 1) {
    params.set("page", String(next.page));
  }

  const query = params.toString();
  return query ? `/activity?${query}` : "/activity";
}

export function activityHref(entityType: string, entityId: string) {
  if (!isUuid(entityId)) {
    return null;
  }

  switch (entityType) {
    case "client":
      return `/clients/${entityId}`;
    case "project":
      return `/projects/${entityId}`;
    case "task":
      return `/tasks/${entityId}`;
    case "invoice":
      return `/invoices/${entityId}`;
    case "payment":
      return "/payments";
    case "file":
      return "/files";
    case "note":
      return "/notes";
    case "time_entry":
      return "/time";
    default:
      return null;
  }
}
