import { isUuid } from "@/lib/utils/ids";
import { isStaffRole, type WorkspaceRole } from "@/types/index";

export type NavItem = {
  title: string;
  href: string;
  icon:
    | "dashboard"
    | "clients"
    | "projects"
    | "tasks"
    | "bugs"
    | "time"
    | "invoices"
    | "payments"
    | "files"
    | "notes"
    | "updates"
    | "activity"
    | "reports"
    | "settings";
};

export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/", icon: "dashboard" },
  { title: "Clients", href: "/clients", icon: "clients" },
  { title: "Projects", href: "/projects", icon: "projects" },
  { title: "Tasks", href: "/tasks", icon: "tasks" },
  { title: "Bugs", href: "/bugs", icon: "bugs" },
  { title: "Time", href: "/time", icon: "time" },
];

export const financeNav: NavItem[] = [
  { title: "Invoices", href: "/invoices", icon: "invoices" },
  { title: "Payments", href: "/payments", icon: "payments" },
];

export const workspaceNav: NavItem[] = [
  { title: "Files", href: "/files", icon: "files" },
  { title: "Notes", href: "/notes", icon: "notes" },
  { title: "Updates", href: "/updates", icon: "updates" },
  { title: "Activity", href: "/activity", icon: "activity" },
  { title: "Reports", href: "/reports", icon: "reports" },
];

export const allNavItems: NavItem[] = [
  ...mainNav,
  ...financeNav,
  ...workspaceNav,
  { title: "Settings", href: "/settings", icon: "settings" },
];

export function navForRole(role: WorkspaceRole) {
  if (isStaffRole(role)) {
    return {
      main: mainNav,
      finance: financeNav,
      workspace: workspaceNav,
      showSettings: true,
    };
  }

  return {
    main: mainNav.filter((item) => item.href !== "/clients" && item.href !== "/time"),
    finance: financeNav,
    workspace: workspaceNav
      .filter((item) => item.href !== "/reports" && item.href !== "/notes")
      .map((item) => {
        if (item.href === "/activity") {
          return { ...item, title: "Timeline" };
        }
        return item;
      }),
    showSettings: false,
  };
}

export function getPageTitle(pathname: string): string {
  if (pathname === "/") {
    return "Dashboard";
  }

  const match = allNavItems.find(
    (item) => item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );

  return match?.title ?? "WorkFlow";
}

export function getBreadcrumbs(pathname: string): { title: string; href: string }[] {
  if (pathname === "/") {
    return [{ title: "Dashboard", href: "/" }];
  }

  const crumbs: { title: string; href: string }[] = [{ title: "Dashboard", href: "/" }];
  const segments = pathname.split("/").filter(Boolean);
  let href = "";

  for (const segment of segments) {
    href += `/${segment}`;
    const known = allNavItems.find((item) => item.href === href);
    crumbs.push({
      title: known?.title ?? (isUuid(segment) ? "Details" : segment.replace(/-/g, " ")),
      href,
    });
  }

  return crumbs;
}
