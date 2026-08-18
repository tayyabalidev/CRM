import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { addCalendarDays, formatDate, zonedDateKey } from "@/lib/utils/dates";
import { safeAppPath } from "@/lib/auth/paths";
import type { Database } from "@/types/database";

export type NotificationType =
  | "task_assigned"
  | "task_due_soon"
  | "invoice_overdue"
  | "payment_recorded"
  | "project_deadline"
  | "client_update";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};

const LIST_LIMIT = 30;

function relatedNotifyFlag(
  value: { notify_in_app: boolean } | { notify_in_app: boolean }[] | null | undefined,
) {
  if (!value) {
    return true;
  }

  const profile = Array.isArray(value) ? value[0] : value;
  return profile?.notify_in_app ?? true;
}

async function listStaffRecipients(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  options?: { excludeUserId?: string },
) {
  const { data } = await supabase
    .from("workspace_members")
    .select("user_id, profiles ( notify_in_app )")
    .eq("workspace_id", workspaceId)
    .in("role", ["owner", "admin", "member"]);

  return (data ?? [])
    .filter((member) => member.user_id !== options?.excludeUserId)
    .filter((member) => relatedNotifyFlag(member.profiles))
    .map((member) => member.user_id);
}

async function listClientRecipients(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  clientId: string,
  options?: { excludeUserId?: string },
) {
  const { data } = await supabase
    .from("workspace_members")
    .select("user_id, profiles ( notify_in_app )")
    .eq("workspace_id", workspaceId)
    .eq("role", "client")
    .eq("client_id", clientId);

  return (data ?? [])
    .filter((member) => member.user_id !== options?.excludeUserId)
    .filter((member) => relatedNotifyFlag(member.profiles))
    .map((member) => member.user_id);
}

export async function createNotification(
  supabase: SupabaseClient<Database>,
  input: {
    workspaceId: string;
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    link?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    dedupeKey?: string | null;
  },
) {
  const safeLink = safeAppPath(input.link);
  const fullRow = {
    workspace_id: input.workspaceId,
    user_id: input.userId,
    title: input.title,
    message: input.message,
    type: input.type,
    link: safeLink,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    dedupe_key: input.dedupeKey ?? null,
  };

  const { error } = await supabase.from("notifications").insert(fullRow);

  if (!error || error.code === "23505") {
    return null;
  }

  // Migration 0006 not applied yet — fall back to base columns + message link.
  const fallbackMessage = safeLink ? `${input.message}\n${safeLink}` : input.message;

  if (input.dedupeKey) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", input.userId)
      .eq("type", input.type)
      .eq("title", input.title)
      .eq("message", fallbackMessage)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return null;
    }
  }

  const { error: fallbackError } = await supabase.from("notifications").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    title: input.title,
    message: fallbackMessage,
    type: input.type,
  });

  if (fallbackError && fallbackError.code !== "23505") {
    return fallbackError;
  }

  return null;
}

export async function notifyUsers(
  supabase: SupabaseClient<Database>,
  input: {
    workspaceId: string;
    userIds: string[];
    title: string;
    message: string;
    type: NotificationType;
    link?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    dedupeKeyForUser?: (userId: string) => string | null;
  },
) {
  const uniqueIds = [...new Set(input.userIds.filter(Boolean))];

  await Promise.all(
    uniqueIds.map((userId) =>
      createNotification(supabase, {
        workspaceId: input.workspaceId,
        userId,
        title: input.title,
        message: input.message,
        type: input.type,
        link: input.link,
        entityType: input.entityType,
        entityId: input.entityId,
        dedupeKey: input.dedupeKeyForUser?.(userId) ?? null,
      }),
    ),
  );
}

export async function notifyTaskAssigned(
  supabase: SupabaseClient<Database>,
  input: {
    workspaceId: string;
    actorId: string;
    assigneeId: string;
    taskId: string;
    taskTitle: string;
  },
) {
  if (input.assigneeId === input.actorId) {
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("notify_in_app")
    .eq("id", input.assigneeId)
    .maybeSingle();

  if (profile && profile.notify_in_app === false) {
    return;
  }

  await createNotification(supabase, {
    workspaceId: input.workspaceId,
    userId: input.assigneeId,
    title: "Task assigned",
    message: `You were assigned “${input.taskTitle}”.`,
    type: "task_assigned",
    link: `/tasks/${input.taskId}`,
    entityType: "task",
    entityId: input.taskId,
  });
}

export async function notifyPaymentRecorded(
  supabase: SupabaseClient<Database>,
  input: {
    workspaceId: string;
    actorId: string;
    paymentId: string;
    amountLabel: string;
    clientName: string;
  },
) {
  const recipients = await listStaffRecipients(supabase, input.workspaceId, {
    excludeUserId: input.actorId,
  });

  if (recipients.length === 0) {
    return;
  }

  await notifyUsers(supabase, {
    workspaceId: input.workspaceId,
    userIds: recipients,
    title: "Payment recorded",
    message: `${input.amountLabel} was recorded for ${input.clientName}.`,
    type: "payment_recorded",
    link: "/payments",
    entityType: "payment",
    entityId: input.paymentId,
  });
}

export async function notifyClientUpdate(
  supabase: SupabaseClient<Database>,
  input: {
    workspaceId: string;
    clientId: string;
    actorId: string;
    noteId: string;
    title: string;
  },
) {
  const recipients = await listClientRecipients(supabase, input.workspaceId, input.clientId, {
    excludeUserId: input.actorId,
  });

  if (recipients.length === 0) {
    return;
  }

  await notifyUsers(supabase, {
    workspaceId: input.workspaceId,
    userIds: recipients,
    title: "New client update",
    message: input.title,
    type: "client_update",
    link: "/updates",
    entityType: "note",
    entityId: input.noteId,
  });
}

export async function syncDeadlineNotifications(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  timeZone: string,
) {
  const today = zonedDateKey(new Date(), timeZone);
  const taskSoonEnd = addCalendarDays(today, 2);
  const projectSoonEnd = addCalendarDays(today, 7);
  const staffIds = await listStaffRecipients(supabase, workspaceId);

  if (staffIds.length === 0) {
    return;
  }

  const [{ data: tasks }, { data: projects }, { data: invoices }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_date, assigned_to, status")
      .eq("workspace_id", workspaceId)
      .neq("status", "completed")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })
      .limit(80),
    supabase
      .from("projects")
      .select("id, name, due_date, status")
      .eq("workspace_id", workspaceId)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })
      .limit(80),
    supabase
      .from("invoices")
      .select("id, invoice_number, due_date, status")
      .eq("workspace_id", workspaceId)
      .in("status", ["sent", "partially_paid", "overdue"])
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })
      .limit(80),
  ]);

  for (const task of tasks ?? []) {
    if (!task.due_date) {
      continue;
    }

    const dueKey = zonedDateKey(task.due_date, timeZone);
    if (dueKey < today || dueKey > taskSoonEnd) {
      continue;
    }

    const targetIds = task.assigned_to
      ? staffIds.includes(task.assigned_to)
        ? [task.assigned_to]
        : []
      : staffIds;

    if (targetIds.length === 0) {
      continue;
    }

    await notifyUsers(supabase, {
      workspaceId,
      userIds: targetIds,
      title: "Task due soon",
      message: `“${task.title}” is due ${formatDate(task.due_date, timeZone)}.`,
      type: "task_due_soon",
      link: `/tasks/${task.id}`,
      entityType: "task",
      entityId: task.id,
      dedupeKeyForUser: (userId) => `task_due_soon:${task.id}:${dueKey}:${userId}`,
    });
  }

  for (const project of projects ?? []) {
    if (!project.due_date) {
      continue;
    }

    if (project.due_date < today || project.due_date > projectSoonEnd) {
      continue;
    }

    await notifyUsers(supabase, {
      workspaceId,
      userIds: staffIds,
      title: "Project deadline approaching",
      message: `“${project.name}” is due ${formatDate(project.due_date, timeZone)}.`,
      type: "project_deadline",
      link: `/projects/${project.id}`,
      entityType: "project",
      entityId: project.id,
      dedupeKeyForUser: (userId) => `project_deadline:${project.id}:${project.due_date}:${userId}`,
    });
  }

  for (const invoice of invoices ?? []) {
    if (!invoice.due_date) {
      continue;
    }

    if (invoice.due_date >= today) {
      continue;
    }

    await notifyUsers(supabase, {
      workspaceId,
      userIds: staffIds,
      title: "Invoice overdue",
      message: `${invoice.invoice_number} was due ${formatDate(invoice.due_date, timeZone)}.`,
      type: "invoice_overdue",
      link: `/invoices/${invoice.id}`,
      entityType: "invoice",
      entityId: invoice.id,
      dedupeKeyForUser: (userId) => `invoice_overdue:${invoice.id}:${invoice.due_date}:${userId}`,
    });
  }
}

export async function getUnreadNotificationCount(workspaceId: string, userId: string): Promise<number> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("notify_in_app")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.notify_in_app === false) {
    return 0;
  }

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("read", false);

  return count ?? 0;
}

export async function getNotificationsForUser(
  workspaceId: string,
  userId: string,
): Promise<{ items: NotificationItem[]; unreadCount: number; enabled: boolean }> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("notify_in_app")
    .eq("id", userId)
    .maybeSingle();

  const enabled = profile?.notify_in_app ?? true;

  if (!enabled) {
    return { items: [], unreadCount: 0, enabled: false };
  }

  const [{ data: items, error: listError }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, message, type, read, link, created_at")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("read", false),
  ]);

  let rows = items;

  if (listError) {
    const fallback = await supabase
      .from("notifications")
      .select("id, title, message, type, read, created_at")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
    rows = (fallback.data ?? []).map((item) => ({ ...item, link: null as string | null }));
  }

  return {
    enabled: true,
    unreadCount: count ?? 0,
    items: (rows ?? []).map((item) => {
      const parsed = parseStoredNotification(item.message, "link" in item ? item.link : null);
      return {
        id: item.id,
        title: item.title,
        message: parsed.message,
        type: item.type,
        read: item.read,
        link: parsed.link,
        createdAt: item.created_at,
      };
    }),
  };
}

function parseStoredNotification(message: string, link: string | null) {
  if (link) {
    return { message, link: safeAppPath(link) };
  }

  const lines = message.split("\n");
  const last = lines[lines.length - 1] ?? "";

  if (last.startsWith("/") && lines.length > 1) {
    return {
      message: lines.slice(0, -1).join("\n"),
      link: safeAppPath(last),
    };
  }

  return { message, link: null };
}

export async function markNotificationRead(workspaceId: string, userId: string, notificationId: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(workspaceId: string, userId: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("read", false);
  revalidatePath("/", "layout");
}
