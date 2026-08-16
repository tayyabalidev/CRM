"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspace } from "@/lib/auth/workspace";
import { logActivity } from "@/lib/services/activity";
import { listProjectOptions } from "@/lib/services/projects";
import { listTaskOptions } from "@/lib/services/tasks";
import { getRunningTimer, type RunningTimer } from "@/lib/services/time";
import { createClient } from "@/lib/supabase/server";
import { fromDateTimeLocalValue } from "@/lib/utils/dates";
import { isUuid } from "@/lib/utils/ids";
import { emptyToNull } from "@/lib/utils/text";
import { startTimerSchema, timeEntrySchema } from "@/lib/validations/time";
import { isStaffRole } from "@/types/index";

function revalidateTime(projectId?: string | null, taskId?: string | null) {
  revalidatePath("/");
  revalidatePath("/time");
  revalidatePath("/projects");
  revalidatePath("/tasks");

  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }

  if (taskId) {
    revalidatePath(`/tasks/${taskId}`);
  }
}

function hourlyRateValue(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed).toFixed(2) : null;
}

function durationBetween(startedAt: string, endedAt: string) {
  return Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000));
}

async function assertProject(workspaceId: string, projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return data;
}

async function assertTask(workspaceId: string, projectId: string, taskId: string | null) {
  if (!taskId) {
    return { id: null as string | null, title: null as string | null };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, project_id")
    .eq("id", taskId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!data || data.project_id !== projectId) {
    return null;
  }

  return { id: data.id, title: data.title };
}

export async function listProjectOptionsAction() {
  const { workspace } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return [];
  }

  return listProjectOptions(workspace.id);
}

export async function listTaskOptionsAction(projectId: string, includeId?: string) {
  const { workspace } = await requireWorkspace();

  if (!isStaffRole(workspace.role) || !isUuid(projectId)) {
    return [];
  }

  return listTaskOptions(workspace.id, projectId, includeId);
}

export async function startTimerAction(input: unknown): Promise<{ error: string } | { running: RunningTimer }> {
  const parsed = startTimerSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to track time." };
  }

  const existing = await getRunningTimer(workspace.id, user.id);

  if (existing) {
    return { error: "Stop the current timer before starting a new one." };
  }

  const project = await assertProject(workspace.id, parsed.data.projectId);

  if (!project) {
    return { error: "Choose a project from this workspace." };
  }

  const taskId = emptyToNull(parsed.data.taskId);
  const task = await assertTask(workspace.id, parsed.data.projectId, taskId);

  if (!task) {
    return { error: "Choose a task from the selected project." };
  }

  const supabase = await createClient();
  const startedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      workspace_id: workspace.id,
      project_id: parsed.data.projectId,
      task_id: task.id,
      user_id: user.id,
      description: emptyToNull(parsed.data.description),
      started_at: startedAt,
      billable: parsed.data.billable,
      hourly_rate: hourlyRateValue(parsed.data.hourlyRate),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not start the timer. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "time_entry",
    entityId: data.id,
    action: "started",
    message: `started a timer on “${project.name}”.`,
  });

  revalidateTime(parsed.data.projectId, task.id);

  return {
    running: {
      id: data.id,
      projectId: parsed.data.projectId,
      projectName: project.name,
      taskId: task.id,
      taskTitle: task.title,
      description: emptyToNull(parsed.data.description),
      startedAt,
      billable: parsed.data.billable,
      hourlyRate: parsed.data.hourlyRate.trim() ? Number(parsed.data.hourlyRate) : null,
    },
  };
}

export async function stopTimerAction(): Promise<{ error: string } | { error?: undefined }> {
  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to track time." };
  }

  const running = await getRunningTimer(workspace.id, user.id);

  if (!running) {
    return { error: "No timer is running." };
  }

  const endedAt = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase
    .from("time_entries")
    .update({
      ended_at: endedAt,
      duration_seconds: durationBetween(running.startedAt, endedAt),
    })
    .eq("id", running.id)
    .eq("workspace_id", workspace.id)
    .is("ended_at", null);

  if (error) {
    return { error: "Could not stop the timer. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "time_entry",
    entityId: running.id,
    action: "stopped",
    message: `stopped the timer on “${running.projectName}”.`,
  });

  revalidateTime(running.projectId, running.taskId);
  return {};
}

export async function discardTimerAction(): Promise<{ error: string } | { error?: undefined }> {
  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to track time." };
  }

  const running = await getRunningTimer(workspace.id, user.id);

  if (!running) {
    return { error: "No timer is running." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", running.id)
    .eq("workspace_id", workspace.id)
    .is("ended_at", null);

  if (error) {
    return { error: "Could not discard the timer. Try again." };
  }

  revalidateTime(running.projectId, running.taskId);
  return {};
}

export async function addTimeEntryAction(input: unknown) {
  const parsed = timeEntrySchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to record time." };
  }

  const startedAt = fromDateTimeLocalValue(parsed.data.startedAt);
  const endedAt = fromDateTimeLocalValue(parsed.data.endedAt);

  if (!startedAt || !endedAt) {
    return { error: "Enter a start and end time." };
  }

  if (Date.parse(endedAt) < Date.parse(startedAt)) {
    return { error: "End time must be after the start time." };
  }

  const project = await assertProject(workspace.id, parsed.data.projectId);

  if (!project) {
    return { error: "Choose a project from this workspace." };
  }

  const taskId = emptyToNull(parsed.data.taskId);
  const task = await assertTask(workspace.id, parsed.data.projectId, taskId);

  if (!task) {
    return { error: "Choose a task from the selected project." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      workspace_id: workspace.id,
      project_id: parsed.data.projectId,
      task_id: task.id,
      user_id: user.id,
      description: emptyToNull(parsed.data.description),
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds: durationBetween(startedAt, endedAt),
      billable: parsed.data.billable,
      hourly_rate: hourlyRateValue(parsed.data.hourlyRate),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not record this time entry. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "time_entry",
    entityId: data.id,
    action: "created",
    message: `recorded time on “${project.name}”.`,
  });

  revalidateTime(parsed.data.projectId, task.id);
  return {};
}

export async function updateTimeEntryAction(entryId: string, input: unknown) {
  if (!isUuid(entryId)) {
    return { error: "Time entry not found." };
  }

  const parsed = timeEntrySchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to edit time entries." };
  }

  const startedAt = fromDateTimeLocalValue(parsed.data.startedAt);
  const endedAt = fromDateTimeLocalValue(parsed.data.endedAt);

  if (!startedAt || !endedAt) {
    return { error: "Enter a start and end time." };
  }

  if (Date.parse(endedAt) < Date.parse(startedAt)) {
    return { error: "End time must be after the start time." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("time_entries")
    .select("id, project_id, task_id, user_id, ended_at")
    .eq("id", entryId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Time entry not found." };
  }

  if (!existing.ended_at) {
    return { error: "Stop the timer before editing this entry." };
  }

  if (existing.user_id !== user.id && workspace.role !== "owner" && workspace.role !== "admin") {
    return { error: "You can only edit your own time entries." };
  }

  const project = await assertProject(workspace.id, parsed.data.projectId);

  if (!project) {
    return { error: "Choose a project from this workspace." };
  }

  const taskId = emptyToNull(parsed.data.taskId);
  const task = await assertTask(workspace.id, parsed.data.projectId, taskId);

  if (!task) {
    return { error: "Choose a task from the selected project." };
  }

  const { error } = await supabase
    .from("time_entries")
    .update({
      project_id: parsed.data.projectId,
      task_id: task.id,
      description: emptyToNull(parsed.data.description),
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds: durationBetween(startedAt, endedAt),
      billable: parsed.data.billable,
      hourly_rate: hourlyRateValue(parsed.data.hourlyRate),
    })
    .eq("id", entryId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not update this time entry. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "time_entry",
    entityId: entryId,
    action: "updated",
    message: `updated a time entry on “${project.name}”.`,
  });

  revalidateTime(parsed.data.projectId, task.id);
  revalidateTime(existing.project_id, existing.task_id);
  return {};
}

export async function deleteTimeEntryAction(entryId: string) {
  if (!isUuid(entryId)) {
    return { error: "Time entry not found." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to delete time entries." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("time_entries")
    .select("id, project_id, task_id, user_id")
    .eq("id", entryId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Time entry not found." };
  }

  if (existing.user_id !== user.id && workspace.role !== "owner" && workspace.role !== "admin") {
    return { error: "You can only delete your own time entries." };
  }

  const { error } = await supabase.from("time_entries").delete().eq("id", entryId).eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not delete this time entry. Try again." };
  }

  revalidateTime(existing.project_id, existing.task_id);
  return {};
}
