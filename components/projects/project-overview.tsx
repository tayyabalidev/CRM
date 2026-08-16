import { ProjectFormSheet } from "@/components/projects/project-form-sheet";
import { ProjectRowActions } from "@/components/projects/project-row-actions";
import { ProjectTabPanels } from "@/components/projects/project-tab-panels";
import { ProjectTabs, type ProjectTab } from "@/components/projects/project-tabs";
import { PriorityBadge, StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import type { ProjectFormClient } from "@/components/projects/project-form-sheet";
import type { ProjectDetail } from "@/lib/services/projects";
import type { WorkspaceRole } from "@/types/index";

export function ProjectOverview({
  detail,
  tab,
  timeZone,
  canManage,
  clients,
  role,
  userId,
}: {
  detail: ProjectDetail;
  tab: ProjectTab;
  timeZone: string;
  canManage: boolean;
  clients: ProjectFormClient[];
  role: WorkspaceRole;
  userId: string;
}) {
  const { project } = detail;
  const formProject = {
    id: project.id,
    name: project.name,
    clientId: project.client_id,
    description: project.description,
    budget: project.budget,
    currency: project.currency,
    startDate: project.start_date,
    dueDate: project.due_date,
    priority: project.priority,
    status: project.status,
    progress: project.progress,
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <StatusBadge value={project.status} />
            <PriorityBadge value={project.priority} />
          </div>
          <p className="text-sm text-muted-foreground">{detail.clientName}</p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2">
            <ProjectFormSheet
              project={formProject}
              clients={clients}
              defaultCurrency={project.currency}
              trigger={<Button variant="outline">Edit</Button>}
            />
            <ProjectRowActions
              project={formProject}
              clients={clients}
              defaultCurrency={project.currency}
            />
          </div>
        ) : null}
      </div>

      <ProjectTabs projectId={project.id} current={tab} canManage={canManage} />
      <ProjectTabPanels
        detail={detail}
        tab={tab}
        timeZone={timeZone}
        canManage={canManage}
        role={role}
        userId={userId}
      />
    </div>
  );
}
