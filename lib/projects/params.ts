import { priorities, projectStatuses, type Priority, type ProjectStatus } from "@/types/index";

export const PROJECT_PAGE_SIZE = 15;
export const PROJECT_BOARD_LIMIT = 80;

export const projectViews = ["list", "grid", "board"] as const;
export const projectSorts = ["name", "due_date", "created_at", "status", "priority"] as const;
export const projectStatusFilters = ["all", ...projectStatuses] as const;
export const projectPriorityFilters = ["all", ...priorities] as const;

export type ProjectView = (typeof projectViews)[number];
export type ProjectSort = (typeof projectSorts)[number];
export type ProjectStatusFilter = (typeof projectStatusFilters)[number];
export type ProjectPriorityFilter = (typeof projectPriorityFilters)[number];

export type ProjectListParams = {
  q: string;
  status: ProjectStatusFilter;
  clientId: string;
  priority: ProjectPriorityFilter;
  sort: ProjectSort;
  dir: "asc" | "desc";
  page: number;
  view: ProjectView;
};

export function parseProjectListParams(searchParams: {
  q?: string;
  status?: string;
  client?: string;
  priority?: string;
  sort?: string;
  dir?: string;
  page?: string;
  view?: string;
}): ProjectListParams {
  const page = Number.parseInt(searchParams.page ?? "1", 10);

  return {
    q: (searchParams.q ?? "").trim(),
    status: projectStatusFilters.includes(searchParams.status as ProjectStatusFilter)
      ? (searchParams.status as ProjectStatusFilter)
      : "all",
    clientId: searchParams.client ?? "",
    priority: projectPriorityFilters.includes(searchParams.priority as ProjectPriorityFilter)
      ? (searchParams.priority as ProjectPriorityFilter)
      : "all",
    sort: projectSorts.includes(searchParams.sort as ProjectSort)
      ? (searchParams.sort as ProjectSort)
      : "due_date",
    dir: searchParams.dir === "desc" ? "desc" : "asc",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    view: projectViews.includes(searchParams.view as ProjectView)
      ? (searchParams.view as ProjectView)
      : "list",
  };
}

export function projectListHref(current: ProjectListParams, patch: Partial<ProjectListParams> = {}) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.q) {
    params.set("q", next.q);
  }

  if (next.status !== "all") {
    params.set("status", next.status);
  }

  if (next.clientId) {
    params.set("client", next.clientId);
  }

  if (next.priority !== "all") {
    params.set("priority", next.priority);
  }

  if (next.sort !== "due_date") {
    params.set("sort", next.sort);
  }

  if (next.dir !== "asc") {
    params.set("dir", next.dir);
  }

  if (next.view !== "list") {
    params.set("view", next.view);
  }

  if (next.view !== "board" && next.page > 1) {
    params.set("page", String(next.page));
  }

  const query = params.toString();
  return query ? `/projects?${query}` : "/projects";
}

export function isProjectStatus(value: string): value is ProjectStatus {
  return projectStatuses.includes(value as ProjectStatus);
}

export function isPriority(value: string): value is Priority {
  return priorities.includes(value as Priority);
}
