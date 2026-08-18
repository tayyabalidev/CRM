"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspace } from "@/lib/auth/workspace";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logActivity } from "@/lib/services/activity";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/ids";
import { FILE_BUCKET, sanitizeFileName, validateUploadFile } from "@/lib/utils/files";
import { emptyToNull } from "@/lib/utils/text";
import { fileRecordSchema } from "@/lib/validations/file";
import { isStaffRole } from "@/types/index";

function revalidateFiles(input?: {
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  invoiceId?: string | null;
}) {
  revalidatePath("/files");
  revalidatePath("/clients");
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/invoices");

  if (input?.clientId) {
    revalidatePath(`/clients/${input.clientId}`);
  }

  if (input?.projectId) {
    revalidatePath(`/projects/${input.projectId}`);
  }

  if (input?.taskId) {
    revalidatePath(`/tasks/${input.taskId}`);
  }

  if (input?.invoiceId) {
    revalidatePath(`/invoices/${input.invoiceId}`);
  }
}

async function resolveFileTargets(
  workspaceId: string,
  input: { clientId: string | null; projectId: string | null; taskId: string | null; invoiceId: string | null },
) {
  const supabase = await createClient();
  let clientId = input.clientId;
  let projectId = input.projectId;
  const taskId = input.taskId;
  const invoiceId = input.invoiceId;

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

  if (invoiceId) {
    const { data } = await supabase
      .from("invoices")
      .select("id, client_id, project_id")
      .eq("id", invoiceId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!data) {
      return { error: "Choose an invoice from this workspace." as const };
    }

    if (clientId && data.client_id !== clientId) {
      return { error: "Choose an invoice that belongs to this client." as const };
    }

    clientId = clientId ?? data.client_id;
    projectId = projectId ?? data.project_id;
  }

  return { clientId, projectId, taskId, invoiceId };
}

export async function createFileRecordAction(input: unknown) {
  const parsed = fileRecordSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Could not save this file." };
  }

  const { workspace, user } = await requireWorkspace();
  const isStaff = isStaffRole(workspace.role);
  const scopedClientId = workspace.clientId;

  if (!isStaff && !scopedClientId) {
    return { error: "You do not have permission to upload files." };
  }
  const uploadLimit = checkRateLimit(`files:upload:${user.id}`, {
    max: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!uploadLimit.ok) {
    return { error: `Upload limit reached. Try again in ${uploadLimit.retryAfterSeconds}s.` };
  }

  const expectedPrefix = `${workspace.id}/${parsed.data.id}/`;
  if (!parsed.data.filePath.startsWith(expectedPrefix)) {
    return { error: "File path is not valid for this workspace." };
  }

  const validationError = validateUploadFile({
    name: parsed.data.fileName,
    size: parsed.data.fileSize,
    type: parsed.data.mimeType,
  });

  if (validationError) {
    return { error: validationError };
  }

  const requestedClientId = emptyToNull(parsed.data.clientId);
  if (!isStaff && requestedClientId && requestedClientId !== scopedClientId) {
    return { error: "You can only upload files for your client account." };
  }

  const targets = await resolveFileTargets(workspace.id, {
    clientId: isStaff ? requestedClientId : scopedClientId,
    projectId: emptyToNull(parsed.data.projectId),
    taskId: emptyToNull(parsed.data.taskId),
    invoiceId: emptyToNull(parsed.data.invoiceId),
  });

  if ("error" in targets) {
    return { error: targets.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("files").insert({
    id: parsed.data.id,
    workspace_id: workspace.id,
    client_id: targets.clientId,
    project_id: targets.projectId,
    task_id: targets.taskId,
    invoice_id: targets.invoiceId,
    uploaded_by: user.id,
    file_name: sanitizeFileName(parsed.data.fileName),
    file_path: parsed.data.filePath,
    file_size: parsed.data.fileSize,
    mime_type: emptyToNull(parsed.data.mimeType),
  });

  if (error) {
    return { error: "Could not save this file. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "file",
    entityId: parsed.data.id,
    action: "uploaded",
    message: `uploaded “${sanitizeFileName(parsed.data.fileName)}”.`,
  });

  revalidateFiles(targets);
  return {};
}

export async function getFileSignedUrlAction(fileId: string, download = false) {
  if (!isUuid(fileId)) {
    return { error: "File not found." };
  }

  const { workspace } = await requireWorkspace();
  const supabase = await createClient();
  const { data: file } = await supabase
    .from("files")
    .select("id, file_name, file_path, mime_type")
    .eq("id", fileId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!file) {
    return { error: "File not found." };
  }

  const { data, error } = await supabase.storage.from(FILE_BUCKET).createSignedUrl(file.file_path, 60, {
    download: download ? file.file_name : undefined,
  });

  if (error || !data?.signedUrl) {
    return { error: "Could not open this file." };
  }

  return { url: data.signedUrl, fileName: file.file_name, mimeType: file.mime_type };
}

export async function deleteFileAction(fileId: string) {
  if (!isUuid(fileId)) {
    return { error: "File not found." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to delete files." };
  }

  const supabase = await createClient();
  const { data: file } = await supabase
    .from("files")
    .select("id, file_path, file_name, client_id, project_id, task_id, invoice_id")
    .eq("id", fileId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!file) {
    return { error: "File not found." };
  }

  await supabase.storage.from(FILE_BUCKET).remove([file.file_path]);

  const { error } = await supabase.from("files").delete().eq("id", fileId).eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not delete this file." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "file",
    entityId: file.id,
    action: "deleted",
    message: `deleted “${file.file_name}”.`,
  });

  revalidateFiles({
    clientId: file.client_id,
    projectId: file.project_id,
    taskId: file.task_id,
    invoiceId: file.invoice_id,
  });
  return {};
}
