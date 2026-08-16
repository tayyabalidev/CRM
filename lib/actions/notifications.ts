"use server";

import { cookies } from "next/headers";

import { requireWorkspace } from "@/lib/auth/workspace";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  syncDeadlineNotifications,
  type NotificationItem,
} from "@/lib/services/notifications";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/ids";
import { isStaffRole } from "@/types/index";

const DEADLINE_SYNC_COOKIE = "workflow_deadline_sync";
const DEADLINE_SYNC_TTL_MS = 15 * 60 * 1000;

export type NotificationsPayload = {
  items: NotificationItem[];
  unreadCount: number;
  enabled: boolean;
};

export async function getNotificationsAction(): Promise<NotificationsPayload> {
  const { workspace, user } = await requireWorkspace();

  if (isStaffRole(workspace.role)) {
    const cookieStore = await cookies();
    const lastRaw = cookieStore.get(DEADLINE_SYNC_COOKIE)?.value;
    const lastMs = lastRaw ? Number.parseInt(lastRaw, 10) : 0;
    const now = Date.now();

    if (!Number.isFinite(lastMs) || now - lastMs >= DEADLINE_SYNC_TTL_MS) {
      const supabase = await createClient();
      await syncDeadlineNotifications(supabase, workspace.id, workspace.timezone);
      cookieStore.set(DEADLINE_SYNC_COOKIE, String(now), {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
      });
    }
  }

  return getNotificationsForUser(workspace.id, user.id);
}

export async function getUnreadNotificationCountAction(): Promise<number> {
  const { workspace, user } = await requireWorkspace();
  return getUnreadNotificationCount(workspace.id, user.id);
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
