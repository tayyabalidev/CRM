"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspace } from "@/lib/auth/workspace";
import { logActivity } from "@/lib/services/activity";
import { notifyTaskAssigned } from "@/lib/services/notifications";
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

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to add tasks." };
  }

  const supabase = await createClient();
  const projectId = emptyToNull(parsed.data.projectId);
  const assigneeId = emptyToNull(parsed.data.assigneeId);

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
      status: parsed.data.status,
      estimated_minutes: estimatedMinutes(parsed.data.estimatedHours),
      completed_at: completedAtFor(parsed.data.status),
    })
    .select("id, title, project_id, client_id")
    .single();

  if (error || !data) {
    return { error: "Could not add this task. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "task",
    entityId: data.id,
    action: "created",
    message: `created “${data.title}”.`,
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

  revalidateTasks(data.id, data.project_id, data.client_id);
  redirect(`/tasks/${data.id}`);
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
    .select("id, title, project_id, client_id")
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
  redirect("/tasks");
}
