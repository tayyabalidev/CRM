import Link from "next/link";

import { cn } from "@/lib/utils";

export const projectTabs = [
  "overview",
  "tasks",
  "screenshots",
  "time",
  "payments",
  "invoices",
  "files",
  "notes",
  "activity",
] as const;

export type ProjectTab = (typeof projectTabs)[number];

const labels: Record<ProjectTab, string> = {
  overview: "Overview",
  tasks: "Tasks",
  time: "Time",
  payments: "Payments",
  invoices: "Invoices",
  files: "Files",
  screenshots: "Screenshots",
  notes: "Notes",
  activity: "Activity",
};

export function parseProjectTab(value: string | undefined): ProjectTab {
  return projectTabs.includes(value as ProjectTab) ? (value as ProjectTab) : "overview";
}

export function ProjectTabs({
  projectId,
  current,
  canManage = true,
}: {
  projectId: string;
  current: ProjectTab;
  canManage?: boolean;
}) {
  const tabs = canManage ? projectTabs : projectTabs.filter((tab) => tab !== "time");

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => {
        const href = tab === "overview" ? `/projects/${projectId}` : `/projects/${projectId}?tab=${tab}`;

        return (
          <Link
            key={tab}
            href={href}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm",
              current === tab
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {labels[tab]}
          </Link>
        );
      })}
    </nav>
  );
}
