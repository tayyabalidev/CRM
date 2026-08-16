"use client";

import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar, type WorkspaceOption } from "@/components/layout/app-sidebar";
import { SearchProvider } from "@/components/search/command-palette";
import { TimerProvider } from "@/components/time/timer-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { RunningTimer } from "@/lib/services/time";
import type { WorkspaceRole } from "@/types/index";

export function AppShell({
  children,
  defaultSidebarOpen,
  workspaceName,
  workspaceLogoUrl,
  workspaces,
  activeWorkspaceId,
  userName,
  userEmail,
  canTrackTime,
  runningTimer,
  role,
  unreadNotifications = 0,
  timeZone = "UTC",
}: {
  children: ReactNode;
  defaultSidebarOpen: boolean;
  workspaceName: string;
  workspaceLogoUrl: string | null;
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
  userName: string;
  userEmail: string;
  canTrackTime: boolean;
  runningTimer: RunningTimer | null;
  role: WorkspaceRole;
  unreadNotifications?: number;
  timeZone?: string;
}) {
  return (
    <TimerProvider canTrack={canTrackTime} initialRunning={runningTimer}>
      <SearchProvider>
        <SidebarProvider defaultOpen={defaultSidebarOpen}>
          <AppSidebar
            workspaceName={workspaceName}
            workspaceLogoUrl={workspaceLogoUrl}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            role={role}
          />
          <SidebarInset>
            <AppHeader
              name={userName}
              email={userEmail}
              unreadNotifications={unreadNotifications}
              timeZone={timeZone}
            />
            <div className="flex flex-1 flex-col">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </SearchProvider>
    </TimerProvider>
  );
}
