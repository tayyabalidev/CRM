"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspace } from "@/lib/auth/workspace";
import { logActivity } from "@/lib/services/activity";
import { notifyClientPortalUsers } from "@/lib/services/notifications";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/ids";
import { emptyToNull } from "@/lib/utils/text";
import { projectSchema } from "@/lib/validations/project";
import { isProjectStatus } from "@/lib/projects/params";
import { isStaffRole, type ProjectStatus } from "@/types/index";

function revalidateProjects(projectId?: string, clientId?: string) {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/clients");

  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }

  if (clientId) {
    revalidatePath(`/clients/${clientId}`);
  }
}

function completedAtFor(status: ProjectStatus, current?: string | null) {
  if (status !== "completed") {
    return null;
  }

  return current ?? new Date().toISOString();
}

function toProjectFields(input: ReturnType<typeof projectSchema.parse>) {
  const budget = emptyToNull(input.budget);

  return {
    name: input.name,
    client_id: input.clientId,
    description: emptyToNull(input.description),
    budget: budget == null ? null : Number(budget).toFixed(2),
    currency: input.currency,
    start_date: emptyToNull(input.startDate),
    due_date: emptyToNull(input.dueDate),
    priority: input.priority,
    status: input.status,
    progress: input.manualProgress ? Number(input.progress) : null,
    completed_at: completedAtFor(input.status),
  };
}

export async function addProjectAction(input: unknown) {
  const parsed = projectSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to add projects." };
  }

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", parsed.data.clientId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!client) {
    return { error: "Choose a client from this workspace." };
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({ workspace_id: workspace.id, ...toProjectFields(parsed.data) })
    .select("id, name, client_id")
    .single();

  if (error || !data) {
    return { error: "Could not add this project. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "project",
    entityId: data.id,
    action: "created",
    message: `created project “${data.name}”.`,
  });

  await notifyClientPortalUsers(supabase, {
    workspaceId: workspace.id,
    clientId: data.client_id,
    actorId: user.id,
    title: "New project",
    message: `“${data.name}” was added to your workspace.`,
    type: "project_created",
    link: `/projects/${data.id}`,
    entityType: "project",
    entityId: data.id,
  });

  revalidateProjects(data.id, data.client_id);
  return { id: data.id, clientId: data.client_id };
}

export async function updateProjectAction(projectId: string, input: unknown) {
  if (!isUuid(projectId)) {
    return { error: "Project not found." };
  }

  const parsed = projectSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to edit projects." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("id, completed_at, status")
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Project not found." };
  }

  const fields = toProjectFields(parsed.data);
  fields.completed_at = completedAtFor(parsed.data.status, existing.completed_at);

  const { data, error } = await supabase
    .from("projects")
    .update(fields)
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .select("id, name, client_id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Could not save this project. Try again." };
  }

  const completed = parsed.data.status === "completed" && existing.status !== "completed";
  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "project",
    entityId: data.id,
    action: completed ? "completed" : "updated",
    message: completed
      ? `marked project “${data.name}” as completed.`
      : `updated project “${data.name}”.`,
  });

  await notifyClientPortalUsers(supabase, {
    workspaceId: workspace.id,
    clientId: data.client_id,
    actorId: user.id,
    title: completed ? "Project completed" : "Project updated",
    message: completed
      ? `“${data.name}” was marked as completed.`
      : `“${data.name}” was updated.`,
    type: "project_updated",
    link: `/projects/${data.id}`,
    entityType: "project",
    entityId: data.id,
  });

  revalidateProjects(data.id, data.client_id);
  return { error: null };
}

export async function updateProjectStatusAction(projectId: string, status: string) {
  if (!isUuid(projectId) || !isProjectStatus(status)) {
    return { error: "Project not found." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to update projects." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("id, name, client_id, completed_at, status")
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Project not found." };
  }

  const { error } = await supabase
    .from("projects")
    .update({
      status,
      completed_at: completedAtFor(status, existing.completed_at),
    })
    .eq("id", projectId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not update this project. Try again." };
  }

  const completed = status === "completed" && existing.status !== "completed";
  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "project",
    entityId: existing.id,
    action: completed ? "completed" : "updated",
    message: completed
      ? `marked project “${existing.name}” as completed.`
      : `moved project “${existing.name}” to ${status.replaceAll("_", " ")}.`,
  });

  revalidateProjects(existing.id, existing.client_id);
  return { error: null };
}

export async function deleteProjectAction(projectId: string) {
  if (!isUuid(projectId)) {
    return { error: "Project not found." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to delete projects." };
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!project) {
    return { error: "Project not found." };
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not delete this project. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "project",
    entityId: project.id,
    action: "deleted",
    message: `deleted project “${project.name}”.`,
  });

  revalidateProjects(undefined, project.client_id);
  redirect("/projects");
}
