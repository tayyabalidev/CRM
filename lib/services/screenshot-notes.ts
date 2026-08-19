import { createClient } from "@/lib/supabase/server";
import { throwUserError } from "@/lib/logging/safe-error";
import { FILE_BUCKET } from "@/lib/utils/files";

export type ScreenshotNoteItem = {
  id: string;
  message: string;
  createdAt: string;
  createdBy: string;
  authorName: string;
  fileId: string;
  fileName: string;
  mimeType: string | null;
  imageUrl: string | null;
  taskId: string | null;
  taskTitle: string | null;
  projectId: string | null;
};

async function mapNotes(
  rows: {
    id: string;
    message: string;
    created_at: string;
    created_by: string;
    file_id: string;
    project_id: string | null;
    task_id: string | null;
    files:
      | { file_name: string; mime_type: string | null; file_path: string }
      | { file_name: string; mime_type: string | null; file_path: string }[]
      | null;
    tasks: { title: string } | { title: string }[] | null;
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  }[],
): Promise<ScreenshotNoteItem[]> {
  const supabase = await createClient();

  return Promise.all(
    rows.map(async (row) => {
      const file = Array.isArray(row.files) ? row.files[0] : row.files;
      const task = Array.isArray(row.tasks) ? row.tasks[0] : row.tasks;
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      let imageUrl: string | null = null;

      if (file?.file_path && (file.mime_type ?? "").startsWith("image/")) {
        const { data } = await supabase.storage.from(FILE_BUCKET).createSignedUrl(file.file_path, 3600);
        imageUrl = data?.signedUrl ?? null;
      }

      return {
        id: row.id,
        message: row.message,
        createdAt: row.created_at,
        createdBy: row.created_by,
        authorName: profile?.full_name?.trim() || "Teammate",
        fileId: row.file_id,
        fileName: file?.file_name ?? "Screenshot",
        mimeType: file?.mime_type ?? null,
        imageUrl,
        taskId: row.task_id,
        taskTitle: task?.title ?? null,
        projectId: row.project_id,
      };
    }),
  );
}

const SELECT = `
  id, message, created_at, created_by, file_id, project_id, task_id,
  files ( file_name, mime_type, file_path ),
  tasks ( title ),
  profiles ( full_name )
`;

export async function listProjectScreenshotNotes(workspaceId: string, projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("screenshot_notes")
    .select(SELECT)
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      return [];
    }
    throwUserError("screenshot_notes.project_list", error, "Could not load screenshots.");
  }

  return mapNotes((data ?? []) as Parameters<typeof mapNotes>[0]);
}

export async function listTaskScreenshotNotes(workspaceId: string, taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("screenshot_notes")
    .select(SELECT)
    .eq("workspace_id", workspaceId)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      return [];
    }
    throwUserError("screenshot_notes.task_list", error, "Could not load screenshots.");
  }

  return mapNotes((data ?? []) as Parameters<typeof mapNotes>[0]);
}
