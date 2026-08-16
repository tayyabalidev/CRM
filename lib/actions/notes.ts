"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspace } from "@/lib/auth/workspace";
import { canCreateNote, canEditNote } from "@/lib/notes/access";
import { logActivity } from "@/lib/services/activity";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/ids";
import { emptyToNull } from "@/lib/utils/text";
import { noteSchema } from "@/lib/validations/note";
import type { NoteVisibility } from "@/types/index";

function revalidateNotes(input?: { clientId?: string | null; projectId?: string | null }) {
  revalidatePath("/notes");
  revalidatePath("/clients");
  revalidatePath("/projects");

  if (input?.clientId) {
    revalidatePath(`/clients/${input.clientId}`);
  }

  if (input?.projectId) {
    revalidatePath(`/projects/${input.projectId}`);
  }
}

async function resolveNoteTargets(
  workspaceId: string,
  input: { clientId: string | null; projectId: string | null },
) {
  const supabase = await createClient();
  let clientId = input.clientId;
  const projectId = input.projectId;

  if (!clientId && !projectId) {
    return { error: "Choose a client or a project." as const };
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

  return { clientId, projectId };
}

async function getEditableNote(workspaceId: string, noteId: string, userId: string, role: Parameters<typeof canEditNote>[0]) {
  if (!isUuid(noteId)) {
    return { error: "Note not found." as const };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("id, title, client_id, project_id, created_by")
    .eq("id", noteId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!data) {
    return { error: "Note not found." as const };
  }

  if (!canEditNote(role, userId, data.created_by)) {
    return { error: "You do not have permission to change this note." as const };
  }

  return { note: data, supabase };
}

export async function createNoteAction(input: unknown) {
  const parsed = noteSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Could not save this note." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!canCreateNote(workspace.role)) {
    return { error: "You do not have permission to add notes." };
  }

  const targets = await resolveNoteTargets(workspace.id, {
    clientId: emptyToNull(parsed.data.clientId),
    projectId: emptyToNull(parsed.data.projectId),
  });

  if ("error" in targets) {
    return { error: targets.error };
  }

  if (parsed.data.visibility === "client" && !targets.clientId) {
    return { error: "Client-visible notes must be attached to a client." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .insert({
      workspace_id: workspace.id,
      client_id: targets.clientId,
      project_id: targets.projectId,
      title: parsed.data.title,
      content: emptyToNull(parsed.data.content),
      created_by: user.id,
      visibility: parsed.data.visibility,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Could not save this note. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "note",
    entityId: data.id,
    action: "created",
    message: `added note “${parsed.data.title}”.`,
  });

  revalidateNotes(targets);
  return {};
}

export async function updateNoteAction(noteId: string, input: unknown) {
  const parsed = noteSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Could not save this note." };
  }

  const { workspace, user } = await requireWorkspace();
  const loaded = await getEditableNote(workspace.id, noteId, user.id, workspace.role);

  if ("error" in loaded) {
    return { error: loaded.error };
  }

  const targets = await resolveNoteTargets(workspace.id, {
    clientId: emptyToNull(parsed.data.clientId),
    projectId: emptyToNull(parsed.data.projectId),
  });

  if ("error" in targets) {
    return { error: targets.error };
  }

  if (parsed.data.visibility === "client" && !targets.clientId) {
    return { error: "Client-visible notes must be attached to a client." };
  }

  const { error } = await loaded.supabase
    .from("notes")
    .update({
      client_id: targets.clientId,
      project_id: targets.projectId,
      title: parsed.data.title,
      content: emptyToNull(parsed.data.content),
      visibility: parsed.data.visibility as NoteVisibility,
    })
    .eq("id", noteId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not save this note. Try again." };
  }

  await logActivity(loaded.supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "note",
    entityId: noteId,
    action: "updated",
    message: `updated note “${parsed.data.title}”.`,
  });

  revalidateNotes({
    clientId: targets.clientId ?? loaded.note.client_id,
    projectId: targets.projectId ?? loaded.note.project_id,
  });
  return {};
}

export async function deleteNoteAction(noteId: string) {
  const { workspace, user } = await requireWorkspace();
  const loaded = await getEditableNote(workspace.id, noteId, user.id, workspace.role);

  if ("error" in loaded) {
    return { error: loaded.error };
  }

  const { error } = await loaded.supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not delete this note." };
  }

  await logActivity(loaded.supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "note",
    entityId: noteId,
    action: "deleted",
    message: `deleted note “${loaded.note.title}”.`,
  });

  revalidateNotes({
    clientId: loaded.note.client_id,
    projectId: loaded.note.project_id,
  });
  return {};
}
