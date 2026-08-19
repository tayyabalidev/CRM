"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspace } from "@/lib/auth/workspace";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logActivity } from "@/lib/services/activity";
import { notifyClientPortalUsers, notifyWorkspaceStaff } from "@/lib/services/notifications";
import { createClient } from "@/lib/supabase/server";
import { FILE_BUCKET, isImageMime, sanitizeFileName, validateImageUpload } from "@/lib/utils/files";
import { isUuid } from "@/lib/utils/ids";
import { emptyToNull } from "@/lib/utils/text";
import { screenshotNoteSchema } from "@/lib/validations/screenshot-note";
import { isStaffRole } from "@/types/index";

function revalidateScreenshotNotes(input: { projectId?: string | null; taskId?: string | null }) {
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/bugs");
  revalidatePath("/files");

  if (input.projectId) {
    revalidatePath(`/projects/${input.projectId}`);
  }

  if (input.taskId) {
    revalidatePath(`/tasks/${input.taskId}`);
  }
}

async function resolveScreenshotTargets(
  workspaceId: string,
  input: { clientId: string | null; projectId: string | null; taskId: string | null },
) {
  const supabase = await createClient();
  let clientId = input.clientId;
  let projectId = input.projectId;
  const taskId = input.taskId;

  if (projectId) {
    const { data } = await supabase
      .from("projects")
      .select("id, client_id")
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!data) {
      return { error: "Choose a project from this workspace." as const };
    }

    if (clientId && data.client_id !== clientId) {
      return { error: "Choose a project that belongs to this client." as const };
    }

    clientId = clientId ?? data.client_id;
  }

  if (taskId) {
    const { data } = await supabase
      .from("tasks")
      .select("id, client_id, project_id")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!data) {
      return { error: "Choose a task from this workspace." as const };
    }

    if (projectId && data.project_id && data.project_id !== projectId) {
      return { error: "Choose a task from the selected project." as const };
    }

    projectId = projectId ?? data.project_id;
    clientId = clientId ?? data.client_id;
  }

  if (clientId) {
    const { data } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!data) {
      return { error: "Choose a client from this workspace." as const };
    }
  }

  if (!projectId && !taskId) {
    return { error: "Attach this screenshot to a project or task." as const };
  }

  return { clientId, projectId, taskId };
}

export async function getActiveWorkspaceIdAction() {
  const { workspace } = await requireWorkspace();
  return { workspaceId: workspace.id };
}

export async function createScreenshotNoteAction(input: unknown) {
  const parsed = screenshotNoteSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Could not save this screenshot." };
  }

  const { workspace, user } = await requireWorkspace();
  const isStaff = isStaffRole(workspace.role);
  const scopedClientId = workspace.clientId;

  if (!isStaff && !scopedClientId) {
    return { error: "You do not have permission to add screenshots." };
  }

  const uploadLimit = checkRateLimit(`screenshots:upload:${user.id}`, {
    max: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!uploadLimit.ok) {
    return { error: `Screenshot limit reached. Try again in ${uploadLimit.retryAfterSeconds}s.` };
  }

  const expectedPrefix = `${workspace.id}/${parsed.data.fileId}/`;
  if (!parsed.data.filePath.startsWith(expectedPrefix)) {
    return { error: "File path is not valid for this workspace." };
  }

  const validationError = validateImageUpload({
    name: parsed.data.fileName,
    size: parsed.data.fileSize,
    type: parsed.data.mimeType,
  });

  if (validationError) {
    return { error: validationError };
  }

  if (!isImageMime(parsed.data.mimeType)) {
    return { error: "Use a screenshot image (JPEG, PNG, GIF, or WebP)." };
  }

  const requestedClientId = emptyToNull(parsed.data.clientId);
  if (!isStaff && requestedClientId && requestedClientId !== scopedClientId) {
    return { error: "You can only add screenshots for your client account." };
  }

  const targets = await resolveScreenshotTargets(workspace.id, {
    clientId: isStaff ? requestedClientId : scopedClientId,
    projectId: emptyToNull(parsed.data.projectId),
    taskId: emptyToNull(parsed.data.taskId),
  });

  if ("error" in targets) {
    return { error: targets.error };
  }

  if (!isStaff && targets.clientId && targets.clientId !== scopedClientId) {
    return { error: "You can only add screenshots for your client account." };
  }

  const supabase = await createClient();
  const fileName = sanitizeFileName(parsed.data.fileName);
  const { error: fileError } = await supabase.from("files").insert({
    id: parsed.data.fileId,
    workspace_id: workspace.id,
    client_id: targets.clientId,
    project_id: targets.projectId,
    task_id: targets.taskId,
    uploaded_by: user.id,
    file_name: fileName,
    file_path: parsed.data.filePath,
    file_size: parsed.data.fileSize,
    mime_type: parsed.data.mimeType,
  });

  if (fileError) {
    return { error: "Could not save this screenshot. Try again." };
  }

  const { error: noteError } = await supabase.from("screenshot_notes").insert({
    workspace_id: workspace.id,
    client_id: targets.clientId,
    project_id: targets.projectId,
    task_id: targets.taskId,
    file_id: parsed.data.fileId,
    created_by: user.id,
    message: parsed.data.message,
  });

  if (noteError) {
    await supabase.from("files").delete().eq("id", parsed.data.fileId).eq("workspace_id", workspace.id);
    await supabase.storage.from(FILE_BUCKET).remove([parsed.data.filePath]);
    return { error: "Could not save this screenshot. Try again." };
  }

  const preview = parsed.data.message.length > 80 ? `${parsed.data.message.slice(0, 77)}…` : parsed.data.message;
  const entityType = targets.taskId ? "task" : "project";
  const entityId = targets.taskId ?? targets.projectId ?? parsed.data.fileId;
  const link = targets.taskId ? `/tasks/${targets.taskId}` : `/projects/${targets.projectId}?tab=screenshots`;

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType,
    entityId,
    action: "screenshot_added",
    message: `added a screenshot: “${preview}”.`,
  });

  if (isStaff) {
    await notifyClientPortalUsers(supabase, {
      workspaceId: workspace.id,
      clientId: targets.clientId,
      actorId: user.id,
      title: "New screenshot",
      message: preview,
      type: "screenshot_note",
      link,
      entityType,
      entityId,
    });
  } else {
    await notifyWorkspaceStaff(supabase, {
      workspaceId: workspace.id,
      actorId: user.id,
      title: "Client screenshot",
      message: preview,
      type: "screenshot_note",
      link,
      entityType,
      entityId,
    });
  }

  revalidateScreenshotNotes(targets);
  return {};
}

export async function deleteScreenshotNoteAction(noteId: string) {
  if (!isUuid(noteId)) {
    return { error: "Screenshot not found." };
  }

  const { workspace, user } = await requireWorkspace();
  const supabase = await createClient();
  const { data: note } = await supabase
    .from("screenshot_notes")
    .select("id, created_by, project_id, task_id, file_id, files ( file_path )")
    .eq("id", noteId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!note) {
    return { error: "Screenshot not found." };
  }

  if (note.created_by !== user.id && !isStaffRole(workspace.role)) {
    return { error: "You do not have permission to delete this screenshot." };
  }

  const file = Array.isArray(note.files) ? note.files[0] : note.files;
  const { error } = await supabase.from("screenshot_notes").delete().eq("id", noteId).eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not delete this screenshot." };
  }

  if (note.file_id) {
    await supabase.from("files").delete().eq("id", note.file_id).eq("workspace_id", workspace.id);
  }

  if (file?.file_path) {
    await supabase.storage.from(FILE_BUCKET).remove([file.file_path]);
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: note.task_id ? "task" : "project",
    entityId: note.task_id ?? note.project_id ?? note.id,
    action: "screenshot_deleted",
    message: "removed a screenshot.",
  });

  revalidateScreenshotNotes({ projectId: note.project_id, taskId: note.task_id });
  return {};
}
