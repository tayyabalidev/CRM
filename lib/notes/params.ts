import { isUuid } from "@/lib/utils/ids";
import { noteVisibilities, type NoteVisibility } from "@/types/index";

export const NOTE_PAGE_SIZE = 24;

export const noteVisibilityFilters = ["all", ...noteVisibilities] as const;

export type NoteVisibilityFilter = (typeof noteVisibilityFilters)[number];

export type NoteListParams = {
  q: string;
  clientId: string;
  projectId: string;
  visibility: NoteVisibilityFilter;
  page: number;
};

export function parseNoteListParams(searchParams: {
  q?: string;
  client?: string;
  project?: string;
  visibility?: string;
  page?: string;
}): NoteListParams {
  const page = Number.parseInt(searchParams.page ?? "1", 10);
  const visibility = noteVisibilityFilters.includes(searchParams.visibility as NoteVisibilityFilter)
    ? (searchParams.visibility as NoteVisibilityFilter)
    : "all";

  return {
    q: (searchParams.q ?? "").trim(),
    clientId: searchParams.client && isUuid(searchParams.client) ? searchParams.client : "",
    projectId: searchParams.project && isUuid(searchParams.project) ? searchParams.project : "",
    visibility,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function noteListHref(current: NoteListParams, patch: Partial<NoteListParams> = {}) {
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

  if (next.visibility !== "all") {
    params.set("visibility", next.visibility);
  }

  if (next.page > 1) {
    params.set("page", String(next.page));
  }

  const query = params.toString();
  return query ? `/notes?${query}` : "/notes";
}

export type { NoteVisibility };
