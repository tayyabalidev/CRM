"use server";

import { requireWorkspace } from "@/lib/auth/workspace";
import {
  getNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  syncDeadlineNotifications,
  type NotificationItem,
} from "@/lib/services/notifications";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/ids";
import { isStaffRole } from "@/types/index";

export type NotificationsPayload = {
  items: NotificationItem[];
  unreadCount: number;
  enabled: boolean;
};

export async function getNotificationsAction(): Promise<NotificationsPayload> {
  const { workspace, user } = await requireWorkspace();
  const supabase = await createClient();

  if (isStaffRole(workspace.role)) {
    await syncDeadlineNotifications(supabase, workspace.id, workspace.timezone);
  }

  return getNotificationsForUser(workspace.id, user.id);
}

export async function getUnreadNotificationCountAction(): Promise<number> {
  const { workspace, user } = await requireWorkspace();
  const result = await getNotificationsForUser(workspace.id, user.id);
  return result.unreadCount;
}

export async function markNotificationReadAction(notificationId: string) {
  if (!isUuid(notificationId)) {
    return { error: "Notification not found." };
  }

  const { workspace, user } = await requireWorkspace();
  await markNotificationRead(workspace.id, user.id, notificationId);
  return {};
}

export async function markAllNotificationsReadAction() {
  const { workspace, user } = await requireWorkspace();
  await markAllNotificationsRead(workspace.id, user.id);
  return {};
}
