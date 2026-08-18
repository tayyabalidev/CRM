"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Clock3,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  PieChart,
  Settings,
  StickyNote,
  Users,
  type LucideIcon,
} from "lucide-react";

import { BrandWordmark } from "@/components/layout/brand-mark";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { navForRole, type NavItem } from "@/lib/navigation";
import type { WorkspaceRole } from "@/types/index";

export type WorkspaceOption = {
  id: string;
  name: string;
  logoUrl: string | null;
  role: WorkspaceRole;
};

const icons: Record<NavItem["icon"], LucideIcon> = {
  dashboard: LayoutDashboard,
  clients: Users,
  projects: LayoutGrid,
  tasks: ListTodo,
  time: Clock3,
  invoices: FileText,
  payments: CreditCard,
  files: FolderOpen,
  notes: StickyNote,
  updates: StickyNote,
  activity: Activity,
  reports: PieChart,
  settings: Settings,
};

function NavGroup({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = icons[item.icon];
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link href={item.href} onClick={onNavigate}>
                    <Icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({
  workspaceName,
  workspaceLogoUrl,
  workspaces,
  activeWorkspaceId,
  role,
}: {
  workspaceName: string;
  workspaceLogoUrl: string | null;
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
  role: WorkspaceRole;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const nav = navForRole(role);

  function closeMobileNav() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-3">
        <Link
          href="/"
          onClick={closeMobileNav}
          className="flex h-10 items-center gap-2 overflow-hidden px-1 group-data-[collapsible=icon]:justify-center"
        >
          <span className="group-data-[collapsible=icon]:hidden">
            <BrandWordmark />
          </span>
          <span className="hidden group-data-[collapsible=icon]:flex">
            <BrandWordmark collapsed />
          </span>
        </Link>
        <WorkspaceSwitcher
          name={workspaceName}
          logoUrl={workspaceLogoUrl}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          portal={!nav.showSettings}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Workspace" items={nav.main} pathname={pathname} onNavigate={closeMobileNav} />
        <NavGroup label="Finance" items={nav.finance} pathname={pathname} onNavigate={closeMobileNav} />
        <NavGroup label="Insights" items={nav.workspace} pathname={pathname} onNavigate={closeMobileNav} />
      </SidebarContent>
      {nav.showSettings ? (
        <SidebarFooter>
          <SidebarSeparator />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/settings")} tooltip="Settings">
                <Link href="/settings" onClick={closeMobileNav}>
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      ) : null}
      <SidebarRail />
    </Sidebar>
  );
}
