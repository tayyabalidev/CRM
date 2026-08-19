"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspace } from "@/lib/auth/workspace";
import { logActivity } from "@/lib/services/activity";
import { notifyClientPortalUsers, notifyTaskAssigned, notifyWorkspaceStaff } from "@/lib/services/notifications";
import { createClient } from "@/lib/supabase/server";
import { isTaskStatus } from "@/lib/tasks/params";
import { fromDateTimeLocalValue } from "@/lib/utils/dates";
import { isUuid } from "@/lib/utils/ids";
import { emptyToNull } from "@/lib/utils/text";
import { taskCommentSchema, taskSchema } from "@/lib/validations/task";
import { isStaffRole, type TaskStatus } from "@/types/index";

function revalidateTasks(taskId?: string, projectId?: string | null, clientId?: string | null) {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/bugs");
  revalidatePath("/projects");
  revalidatePath("/clients");

  if (taskId) {
    revalidatePath(`/tasks/${taskId}`);
  }

  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }

  if (clientId) {
    revalidatePath(`/clients/${clientId}`);
  }
}

function completedAtFor(status: TaskStatus, current?: string | null) {
  if (status !== "completed") {
    return null;
  }

  return current ?? new Date().toISOString();
}

function estimatedMinutes(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return Math.round(Number(trimmed) * 60);
}

export async function addTaskAction(input: unknown) {
  const parsed = taskSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace, user } = await requireWorkspace();
  const staff = isStaffRole(workspace.role);
  const kind = parsed.data.kind;

  if (!staff && kind !== "bug") {
    return { error: "You do not have permission to add tasks." };
  }

  const supabase = await createClient();
  const projectId = emptyToNull(parsed.data.projectId);
  const assigneeId = staff ? emptyToNull(parsed.data.assigneeId) : null;
  const status = staff ? parsed.data.status : "todo";
  const estimatedHours = staff ? parsed.data.estimatedHours : "";

  if (kind === "bug" && !projectId) {
    return { error: "Choose a project for this bug." };
  }

  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (!project) {
      return { error: "Choose a project from this workspace." };
    }
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspace.id,
      title: parsed.data.title,
      description: emptyToNull(parsed.data.description),
      project_id: projectId,
      assigned_to: assigneeId,
      due_date: fromDateTimeLocalValue(parsed.data.dueDate),
      priority: parsed.data.priority,
      status,
      kind,
      created_by: user.id,
      estimated_minutes: estimatedMinutes(estimatedHours),
      completed_at: completedAtFor(status),
    })
    .select("id, title, project_id, client_id, kind")
    .single();

  if (error || !data) {
    return { error: kind === "bug" ? "Could not add this bug. Try again." : "Could not add this task. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "task",
    entityId: data.id,
    action: "created",
    message: kind === "bug" ? `reported “${data.title}”.` : `created “${data.title}”.`,
  });

  if (assigneeId) {
    await notifyTaskAssigned(supabase, {
      workspaceId: workspace.id,
      actorId: user.id,
      assigneeId,
      taskId: data.id,
      taskTitle: data.title,
    });
  }

  if (!staff) {
    await notifyWorkspaceStaff(supabase, {
      workspaceId: workspace.id,
      actorId: user.id,
      title: "New bug report",
      message: `“${data.title}” was reported.`,
      type: "task_created",
      link: `/tasks/${data.id}`,
      entityType: "task",
      entityId: data.id,
    });
  }

  await notifyClientPortalUsers(supabase, {
    workspaceId: workspace.id,
    clientId: data.client_id,
    actorId: user.id,
    title: kind === "bug" ? "New bug" : "New task",
    message: `“${data.title}” was added.`,
    type: "task_created",
    link: `/tasks/${data.id}`,
    entityType: "task",
    entityId: data.id,
  });

  revalidateTasks(data.id, data.project_id, data.client_id);
  return { id: data.id, projectId: data.project_id, clientId: data.client_id };
}

export async function updateTaskAction(taskId: string, input: unknown) {
  if (!isUuid(taskId)) {
    return { error: "Task not found." };
  }

  const parsed = taskSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to edit tasks." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("tasks")
    .select("id, completed_at, status, assigned_to")
    .eq("id", taskId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Task not found." };
  }

  const projectId = emptyToNull(parsed.data.projectId);
  const assigneeId = emptyToNull(parsed.data.assigneeId);

  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: parsed.data.title,
      description: emptyToNull(parsed.data.description),
      project_id: projectId,
      assigned_to: assigneeId,
      due_date: fromDateTimeLocalValue(parsed.data.dueDate),
      priority: parsed.data.priority,
      status: parsed.data.status,
      estimated_minutes: estimatedMinutes(parsed.data.estimatedHours),
      completed_at: completedAtFor(parsed.data.status, existing.completed_at),
    })
    .eq("id", taskId)
    .eq("workspace_id", workspace.id)
    .select("id, title, project_id, client_id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Could not save this task. Try again." };
  }

  const completed = parsed.data.status === "completed" && existing.status !== "completed";
  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "task",
    entityId: data.id,
    action: completed ? "completed" : "updated",
    message: completed ? `marked “${data.title}” as completed.` : `updated “${data.title}”.`,
  });

  if (assigneeId && assigneeId !== existing.assigned_to) {
    await notifyTaskAssigned(supabase, {
      workspaceId: workspace.id,
      actorId: user.id,
      assigneeId,
      taskId: data.id,
      taskTitle: data.title,
    });
  }

  await notifyClientPortalUsers(supabase, {
    workspaceId: workspace.id,
    clientId: data.client_id,
    actorId: user.id,
    title: completed ? "Task completed" : "Task updated",
    message: completed ? `“${data.title}” was marked as completed.` : `“${data.title}” was updated.`,
    type: completed ? "task_completed" : "client_update",
    link: `/tasks/${data.id}`,
    entityType: "task",
    entityId: data.id,
  });

  revalidateTasks(data.id, data.project_id, data.client_id);
  return { error: null };
}

export async function updateTaskStatusAction(taskId: string, status: string) {
  if (!isUuid(taskId) || !isTaskStatus(status)) {
    return { error: "Task not found." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to update tasks." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("tasks")
    .select("id, title, project_id, client_id, completed_at")
    .eq("id", taskId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Task not found." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      completed_at: completedAtFor(status, existing.completed_at),
    })
    .eq("id", taskId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not update this task. Try again." };
  }

  const completed = status === "completed";
  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "task",
    entityId: existing.id,
    action: completed ? "completed" : "updated",
    message: `marked “${existing.title}” as ${status.replaceAll("_", " ")}.`,
  });

  await notifyClientPortalUsers(supabase, {
    workspaceId: workspace.id,
    clientId: existing.client_id,
    actorId: user.id,
    title: completed ? "Task completed" : "Task updated",
    message: `“${existing.title}” is now ${status.replaceAll("_", " ")}.`,
    type: completed ? "task_completed" : "client_update",
    link: `/tasks/${existing.id}`,
    entityType: "task",
    entityId: existing.id,
  });

  revalidateTasks(existing.id, existing.project_id, existing.client_id);
  return { error: null };
}

export async function addTaskCommentAction(taskId: string, input: unknown) {
  if (!isUuid(taskId)) {
    return { error: "Task not found." };
  }

  const parsed = taskCommentSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Write a comment." };
  }

  const { workspace, user } = await requireWorkspace();

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, project_id, client_id")
    .eq("id", taskId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!task) {
    return { error: "Task not found." };
  }

  const { error } = await supabase.from("task_comments").insert({
    task_id: taskId,
    user_id: user.id,
    content: parsed.data.content,
  });

  if (error) {
    return { error: "Could not add this comment. Try again." };
  }

  if (isStaffRole(workspace.role)) {
    await logActivity(supabase, {
      workspaceId: workspace.id,
      userId: user.id,
      entityType: "task",
      entityId: task.id,
      action: "commented",
      message: `commented on “${task.title}”.`,
    });

    await notifyClientPortalUsers(supabase, {
      workspaceId: workspace.id,
      clientId: task.client_id,
      actorId: user.id,
      title: "New comment",
      message: `A comment was added on “${task.title}”.`,
      type: "task_comment",
      link: `/tasks/${task.id}`,
      entityType: "task",
      entityId: task.id,
    });
  }

  revalidateTasks(task.id, task.project_id, task.client_id);
  return { error: null };
}

export async function deleteTaskAction(taskId: string) {
  if (!isUuid(taskId)) {
    return { error: "Task not found." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to delete tasks." };
  }

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, project_id, client_id, kind")
    .eq("id", taskId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!task) {
    return { error: "Task not found." };
  }

  const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not delete this task. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "task",
    entityId: task.id,
    action: "deleted",
    message: `deleted “${task.title}”.`,
  });

  revalidateTasks(undefined, task.project_id, task.client_id);
  redirect(task.kind === "bug" ? "/bugs" : "/tasks");
}
