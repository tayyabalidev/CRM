import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ACTIVE_WORKSPACE_COOKIE, pickActiveWorkspace } from "@/lib/auth/active-workspace";
import { AUTH_PATHS } from "@/lib/auth/paths";
import { requireAuthState } from "@/lib/auth/session";
import { getNotificationsForUser } from "@/lib/services/notifications";
import { getRunningTimer } from "@/lib/services/time";
import { isStaffRole } from "@/types/index";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const state = await requireAuthState();

  if (state.workspaces.length === 0) {
    redirect(AUTH_PATHS.onboarding);
  }

  const cookieStore = await cookies();
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const preferredId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null;
  const workspace = pickActiveWorkspace(state.workspaces, preferredId);

  if (!workspace) {
    redirect(AUTH_PATHS.onboarding);
  }

  const canTrackTime = isStaffRole(workspace.role);
  const runningTimer = canTrackTime ? await getRunningTimer(workspace.id, state.user.id) : null;
  const notifications = await getNotificationsForUser(workspace.id, state.user.id);

  return (
    <AppShell
      defaultSidebarOpen={defaultSidebarOpen}
      workspaceName={workspace.name}
      workspaceLogoUrl={workspace.logo_url}
      workspaces={state.workspaces.map((item) => ({
        id: item.id,
        name: item.name,
        logoUrl: item.logo_url,
        role: item.role,
      }))
      }
      activeWorkspaceId={workspace.id}
      userName={state.profile?.full_name || state.user.email}
      userEmail={state.user.email}
      canTrackTime={canTrackTime}
      runningTimer={runningTimer}
      role={workspace.role}
      unreadNotifications={notifications.unreadCount}
      timeZone={workspace.timezone}
    >
      {children}
    </AppShell>
  );
}
