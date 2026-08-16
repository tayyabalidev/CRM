import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardProject } from "@/lib/services/dashboard";
import { formatDate } from "@/lib/utils/dates";

export function ProjectOverview({
  projects,
  timeZone,
}: {
  projects: DashboardProject[];
  timeZone: string;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Project overview</CardTitle>
          <CardDescription>Active work and upcoming deadlines.</CardDescription>
        </div>
        <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="size-4" />}
            title="No active projects"
            description="Active projects will show progress, client, and due date here."
          />
        ) : (
          <ul className="divide-y">
            {projects.map((project) => (
              <li key={project.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{project.clientName}</p>
                </div>
                <div className="flex w-full items-center gap-3 sm:w-56">
                  <ProgressBar value={project.progress} />
                </div>
                <div className="flex items-center gap-2 sm:w-40 sm:justify-end">
                  <span className="text-xs text-muted-foreground">
                    {project.dueDate ? formatDate(project.dueDate, timeZone) : "No due date"}
                  </span>
                  <StatusBadge value={project.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
