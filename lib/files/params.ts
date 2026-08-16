import { isUuid } from "@/lib/utils/ids";

export const FILE_PAGE_SIZE = 24;

export type FileListParams = {
  q: string;
  clientId: string;
  projectId: string;
  taskId: string;
  invoiceId: string;
  page: number;
};

export function parseFileListParams(searchParams: {
  q?: string;
  client?: string;
  project?: string;
  task?: string;
  invoice?: string;
  page?: string;
}): FileListParams {
  const page = Number.parseInt(searchParams.page ?? "1", 10);

  return {
    q: (searchParams.q ?? "").trim(),
    clientId: searchParams.client && isUuid(searchParams.client) ? searchParams.client : "",
    projectId: searchParams.project && isUuid(searchParams.project) ? searchParams.project : "",
    taskId: searchParams.task && isUuid(searchParams.task) ? searchParams.task : "",
    invoiceId: searchParams.invoice && isUuid(searchParams.invoice) ? searchParams.invoice : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function fileListHref(current: FileListParams, patch: Partial<FileListParams> = {}) {
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

  if (next.taskId) {
    params.set("task", next.taskId);
  }

  if (next.invoiceId) {
    params.set("invoice", next.invoiceId);
  }

  if (next.page > 1) {
    params.set("page", String(next.page));
  }

  const query = params.toString();
  return query ? `/files?${query}` : "/files";
}
