import Link from "next/link";
import type { ReactNode } from "react";
import { FolderKanban } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { PriorityBadge, StatusBadge } from "@/components/dashboard/status-badge";
import { ProjectRowActions } from "@/components/projects/project-row-actions";
import type { ProjectFormClient } from "@/components/projects/project-form-sheet";
import { Card, CardContent } from "@/components/ui/card";
import type { ProjectListItem } from "@/lib/services/projects";
import { formatDate } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";

export function toFormProject(project: ProjectListItem) {
  return {
    id: project.id,
    name: project.name,
    clientId: project.clientId,
    description: project.description,
    budget: project.budget,
    currency: project.currency,
    startDate: project.startDate,
    dueDate: project.dueDate,
    priority: project.priority,
    status: project.status,
    progress: project.progressSource === "manual" ? project.progress : null,
  };
}

export function ProjectList({
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
    <>
      <div className="grid gap-3 md:hidden">
        {projects.map((project) => (
          <Card key={project.id} size="sm">
            <CardContent className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/projects/${project.id}`} className="min-w-0">
                  <p className="truncate font-medium">{project.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{project.clientName}</p>
                </Link>
                {canManage ? (
                  <ProjectRowActions
                    project={toFormProject(project)}
                    clients={clients}
                    defaultCurrency={defaultCurrency}
                  />
                ) : null}
              </div>
              <ProgressBar value={project.progress} />
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={project.status} />
                <PriorityBadge value={project.priority} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden min-w-0 md:block">
        <CardContent className="overflow-x-auto px-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Project</th>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Progress</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Due</th>
                {canManage ? <th className="px-4 py-2 font-medium">Budget</th> : null}
                {canManage ? (
                  <th className="px-4 py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                      {project.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {project.progressSource === "manual" ? "Manual progress" : `${project.taskCompleted}/${project.taskTotal} tasks`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{project.clientName}</td>
                  <td className="px-4 py-3 sm:w-48">
                    <ProgressBar value={project.progress} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge value={project.status} />
                      <PriorityBadge value={project.priority} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {project.dueDate ? formatDate(project.dueDate, timeZone) : "—"}
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.budget == null ? "—" : formatMoney(project.budget, project.currency)}
                    </td>
                  ) : null}
                  {canManage ? (
                    <td className="px-4 py-3 text-right">
                      <ProjectRowActions
                        project={toFormProject(project)}
                        clients={clients}
                        defaultCurrency={defaultCurrency}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
