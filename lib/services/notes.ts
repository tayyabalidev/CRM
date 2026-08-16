import { NOTE_PAGE_SIZE, type NoteListParams } from "@/lib/notes/params";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/utils/text";
import type { NoteVisibility } from "@/types/index";

export type NoteListItem = {
  id: string;
  title: string;
  content: string | null;
  visibility: NoteVisibility;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
};

export type NotePageData = {
  notes: NoteListItem[];
  total: number;
  page: number;
  pageCount: number;
};

function relatedName(value: { name: string } | { name: string }[] | null | undefined) {
  if (!value) {
    return null;
  }

  const row = Array.isArray(value) ? value[0] : value;
  return row?.name ?? null;
}

export async function getNotePageData(workspaceId: string, params: NoteListParams): Promise<NotePageData> {
  const supabase = await createClient();
  const search = sanitizeSearch(params.q);
  const from = (params.page - 1) * NOTE_PAGE_SIZE;
  const to = from + NOTE_PAGE_SIZE - 1;

  let query = supabase
    .from("notes")
    .select(
      "id, title, content, visibility, created_at, updated_at, created_by, client_id, project_id, clients ( name ), projects ( name )",
      { count: "exact" },
    )
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (params.clientId) {
    query = query.eq("client_id", params.clientId);
  }

  if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  }

  if (params.visibility !== "all") {
    query = query.eq("visibility", params.visibility);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error("Could not load notes.");
  }

  const total = count ?? 0;

  return {
    notes: (data ?? []).map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      visibility: note.visibility,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      createdBy: note.created_by,
      clientId: note.client_id,
      clientName: relatedName(note.clients),
      projectId: note.project_id,
      projectName: relatedName(note.projects),
    })),
    total,
    page: params.page,
    pageCount: Math.max(1, Math.ceil(total / NOTE_PAGE_SIZE)),
  };
}
