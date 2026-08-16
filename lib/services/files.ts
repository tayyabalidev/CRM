import { FILE_PAGE_SIZE, type FileListParams } from "@/lib/files/params";
import { createClient } from "@/lib/supabase/server";
import { OPTION_LIST_LIMIT } from "@/lib/utils/options";
import { sanitizeSearch } from "@/lib/utils/text";

export type FileListItem = {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string | null;
  createdAt: string;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  taskTitle: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  uploadedByName: string | null;
};

export type FilePageData = {
  files: FileListItem[];
  total: number;
  page: number;
  pageCount: number;
};

function relatedName(value: { name?: string; title?: string; invoice_number?: string; full_name?: string } | { name?: string; title?: string; invoice_number?: string; full_name?: string }[] | null | undefined) {
  if (!value) {
    return null;
  }

  const row = Array.isArray(value) ? value[0] : value;
  return row?.name ?? row?.title ?? row?.invoice_number ?? row?.full_name ?? null;
}

export async function getFilePageData(workspaceId: string, params: FileListParams): Promise<FilePageData> {
  const supabase = await createClient();
  const search = sanitizeSearch(params.q);
  const from = (params.page - 1) * FILE_PAGE_SIZE;
  const to = from + FILE_PAGE_SIZE - 1;

  let query = supabase
    .from("files")
    .select(
      "id, file_name, file_path, file_size, mime_type, created_at, client_id, project_id, task_id, invoice_id, clients ( name ), projects ( name ), tasks ( title ), invoices ( invoice_number )",
      { count: "exact" },
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.clientId) {
    query = query.eq("client_id", params.clientId);
  }

  if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  }

  if (params.taskId) {
    query = query.eq("task_id", params.taskId);
  }

  if (params.invoiceId) {
    query = query.eq("invoice_id", params.invoiceId);
  }

  if (search) {
    query = query.ilike("file_name", `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error("Could not load files.");
  }

  const total = count ?? 0;

  return {
    files: (data ?? []).map((file) => ({
      id: file.id,
      fileName: file.file_name,
      filePath: file.file_path,
      fileSize: Number(file.file_size),
      mimeType: file.mime_type,
      createdAt: file.created_at,
      clientId: file.client_id,
      clientName: relatedName(file.clients),
      projectId: file.project_id,
      projectName: relatedName(file.projects),
      taskId: file.task_id,
      taskTitle: relatedName(file.tasks),
      invoiceId: file.invoice_id,
      invoiceNumber: relatedName(file.invoices),
      uploadedByName: null,
    })),
    total,
    page: params.page,
    pageCount: Math.max(1, Math.ceil(total / FILE_PAGE_SIZE)),
  };
}

export async function listFileTaskOptions(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, project_id, client_id")
    .eq("workspace_id", workspaceId)
    .order("title", { ascending: true })
    .limit(OPTION_LIST_LIMIT);

  return (data ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    projectId: task.project_id,
    clientId: task.client_id,
  }));
}

export async function getFileRecord(workspaceId: string, fileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("files")
    .select("id, file_name, file_path, file_size, mime_type, client_id, project_id, task_id, invoice_id")
    .eq("workspace_id", workspaceId)
    .eq("id", fileId)
    .maybeSingle();

  return data;
}
