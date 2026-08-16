import Link from "next/link";
import type { ReactNode } from "react";
import { FolderKanban } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { PriorityBadge, StatusBadge } from "@/components/dashboard/status-badge";
import type { ProjectFormClient } from "@/components/projects/project-form-sheet";
import { ProjectRowActions } from "@/components/projects/project-row-actions";
import { toFormProject } from "@/components/projects/project-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectListItem } from "@/lib/services/projects";
import { formatDate } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";

export function ProjectGrid({
  projects,
  timeZone,
  canManage,
  clients,
  defaultCurrency,
  emptyAction,
  hasFilters,
}: {
  projects: ProjectListItem[];
  timeZone: string;
  canManage: boolean;
  clients: ProjectFormClient[];
  defaultCurrency: string;
  emptyAction?: ReactNode;
  hasFilters: boolean;
}) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<FolderKanban className="size-4" />}
            title={hasFilters ? "No matching projects" : "No projects yet"}
            description={
              hasFilters
                ? "Try a different search or filter."
                : canManage
                  ? "Create a project to track work, budget, and deadlines."
                  : "Projects shared with you will appear here."
            }
            action={hasFilters ? undefined : emptyAction}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <Card key={project.id} className="min-w-0">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="truncate">
                <Link href={`/projects/${project.id}`} className="hover:underline">
                  {project.name}
                </Link>
              </CardTitle>
              <p className="truncate text-xs text-muted-foreground">{project.clientName}</p>
            </div>
            {canManage ? (
              <ProjectRowActions
                project={toFormProject(project)}
                clients={clients}
                defaultCurrency={defaultCurrency}
              />
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            <ProgressBar value={project.progress} />
            <div className="flex flex-wrap gap-1">
              <StatusBadge value={project.status} />
              <PriorityBadge value={project.priority} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{project.dueDate ? `Due ${formatDate(project.dueDate, timeZone)}` : "No due date"}</span>
              {canManage ? (
                <span>{project.budget == null ? "No budget" : formatMoney(project.budget, project.currency)}</span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
