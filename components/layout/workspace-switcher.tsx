"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import type { WorkspaceOption } from "@/components/layout/app-sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { switchWorkspaceAction } from "@/lib/actions/workspace";
import { isStaffRole } from "@/types/index";

function WorkspaceMark({ name, logoUrl, size }: { name: string; logoUrl: string | null; size: "sm" | "md" }) {
  const initial = name.trim().charAt(0).toUpperCase() || "W";
  const px = size === "md" ? 32 : 24;
  const box = size === "md" ? "size-8 text-xs" : "size-6 text-[11px]";

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={px}
        height={px}
        unoptimized
        className={`${box} rounded-lg border border-sidebar-border object-cover`}
      />
    );
  }

  return (
    <span
      className={`flex ${box} items-center justify-center rounded-lg border border-sidebar-border bg-background font-semibold`}
    >
      {initial}
    </span>
  );
}

export function WorkspaceSwitcher({
  name,
  logoUrl = null,
  workspaces,
  activeWorkspaceId,
  portal = false,
}: {
  name: string;
  logoUrl?: string | null;
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
  portal?: boolean;
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip="Workspace"
            >
              <WorkspaceMark name={name} logoUrl={logoUrl} size="md" />
              <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {portal ? "Client portal" : "Current workspace"}
                </span>
              </span>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={8}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
            {workspaces.map((workspace) => {
              const active = workspace.id === activeWorkspaceId;

              return (
                <DropdownMenuItem
                  key={workspace.id}
                  className="gap-2"
                  disabled={pending || active}
                  onSelect={() => {
                    startTransition(async () => {
                      const result = await switchWorkspaceAction(workspace.id);
                      if (result.error) {
                        toast.error(result.error);
                        return;
                      }
                      router.refresh();
                    });
                  }}
                >
                  <WorkspaceMark name={workspace.name} logoUrl={workspace.logoUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{workspace.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {isStaffRole(workspace.role) ? "Staff" : "Client portal"}
                    </span>
                  </span>
                  {active ? <Check className="size-4" /> : null}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
