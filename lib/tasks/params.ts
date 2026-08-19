import { isUuid } from "@/lib/utils/ids";
import { priorities, taskStatuses, type Priority, type TaskStatus } from "@/types/index";

export const TASK_PAGE_SIZE = 20;
export const TASK_BOARD_LIMIT = 100;

export const taskViews = ["list", "table", "board"] as const;
export const taskSorts = ["due_date", "created_at", "title", "priority", "status"] as const;
export const taskStatusFilters = ["all", ...taskStatuses] as const;
export const taskPriorityFilters = ["all", ...priorities] as const;
export const taskDueFilters = ["all", "overdue", "today", "upcoming", "none"] as const;

export type TaskView = (typeof taskViews)[number];
export type TaskSort = (typeof taskSorts)[number];
export type TaskStatusFilter = (typeof taskStatusFilters)[number];
export type TaskPriorityFilter = (typeof taskPriorityFilters)[number];
export type TaskDueFilter = (typeof taskDueFilters)[number];

export type TaskListParams = {
  q: string;
  status: TaskStatusFilter;
  priority: TaskPriorityFilter;
  projectId: string;
  assigneeId: string;
  due: TaskDueFilter;
  sort: TaskSort;
  dir: "asc" | "desc";
  page: number;
  view: TaskView;
  hideComplete: boolean;
};

export const taskSortLabels: Record<TaskSort, string> = {
  due_date: "Due date",
  created_at: "Created",
  title: "Title",
  priority: "Priority",
  status: "Status",
};

export const taskDueLabels: Record<TaskDueFilter, string> = {
  all: "Any due date",
  overdue: "Overdue",
  today: "Due today",
  upcoming: "Upcoming",
  none: "No due date",
};

export function parseTaskListParams(searchParams: {
  q?: string;
  status?: string;
  priority?: string;
  project?: string;
  assignee?: string;
  due?: string;
  sort?: string;
  dir?: string;
  page?: string;
  view?: string;
  hide?: string;
}): TaskListParams {
  const page = Number.parseInt(searchParams.page ?? "1", 10);

  return {
    q: (searchParams.q ?? "").trim(),
    status: taskStatusFilters.includes(searchParams.status as TaskStatusFilter)
      ? (searchParams.status as TaskStatusFilter)
      : "all",
    priority: taskPriorityFilters.includes(searchParams.priority as TaskPriorityFilter)
      ? (searchParams.priority as TaskPriorityFilter)
      : "all",
    projectId: searchParams.project && isUuid(searchParams.project) ? searchParams.project : "",
    assigneeId:
      searchParams.assignee === "unassigned" || (searchParams.assignee && isUuid(searchParams.assignee))
        ? searchParams.assignee
        : "",
    due: taskDueFilters.includes(searchParams.due as TaskDueFilter)
      ? (searchParams.due as TaskDueFilter)
      : "all",
    sort: taskSorts.includes(searchParams.sort as TaskSort) ? (searchParams.sort as TaskSort) : "due_date",
    dir: searchParams.dir === "desc" ? "desc" : "asc",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    view: taskViews.includes(searchParams.view as TaskView) ? (searchParams.view as TaskView) : "list",
    hideComplete: searchParams.hide === "complete",
  };
}

export function taskListHref(current: TaskListParams, patch: Partial<TaskListParams> = {}) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.q) {
    params.set("q", next.q);
  }

  if (next.status !== "all") {
    params.set("status", next.status);
  }

  if (next.priority !== "all") {
    params.set("priority", next.priority);
  }

  if (next.projectId) {
    params.set("project", next.projectId);
  }

  if (next.assigneeId) {
    params.set("assignee", next.assigneeId);
  }

  if (next.due !== "all") {
    params.set("due", next.due);
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

  if (next.hideComplete) {
    params.set("hide", "complete");
  }

  if (next.view !== "board" && next.page > 1) {
    params.set("page", String(next.page));
  }

  const query = params.toString();
  return query ? `/tasks?${query}` : "/tasks";
}

export function hasTaskFilters(params: TaskListParams) {
  return (
    Boolean(params.q) ||
    params.status !== "all" ||
    params.priority !== "all" ||
    Boolean(params.projectId) ||
    Boolean(params.assigneeId) ||
    params.due !== "all" ||
    params.hideComplete
  );
}

export function hasTaskSheetFilters(params: TaskListParams) {
  return (
    params.status !== "all" ||
    params.priority !== "all" ||
    Boolean(params.projectId) ||
    Boolean(params.assigneeId) ||
    params.due !== "all" ||
    params.sort !== "due_date" ||
    params.dir !== "asc"
  );
}

export function resetTaskSheetFilters(current: TaskListParams): TaskListParams {
  return {
    ...current,
    status: "all",
    priority: "all",
    projectId: "",
    assigneeId: "",
    due: "all",
    sort: "due_date",
    dir: "asc",
    page: 1,
  };
}

export function isTaskStatus(value: string): value is TaskStatus {
  return taskStatuses.includes(value as TaskStatus);
}

export function isTaskPriority(value: string): value is Priority {
  return priorities.includes(value as Priority);
}
