import { Plus } from "lucide-react";

import { ProjectBoard } from "@/components/projects/project-board";
import { ProjectFormSheet } from "@/components/projects/project-form-sheet";
import { ProjectGrid } from "@/components/projects/project-grid";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectPagination } from "@/components/projects/project-pagination";
import { ProjectToolbar } from "@/components/projects/project-toolbar";
import { ProjectViewToggle } from "@/components/projects/project-view-toggle";
import { Button } from "@/components/ui/button";
import { requireWorkspace } from "@/lib/auth/workspace";
import { parseProjectListParams } from "@/lib/projects/params";
import { listClientOptions } from "@/lib/services/clients";
import { listProjects } from "@/lib/services/projects";
import { isStaffRole } from "@/types/index";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    client?: string;
    priority?: string;
    sort?: string;
    dir?: string;
    page?: string;
    view?: string;
  }>;
}) {
  const params = parseProjectListParams(await searchParams);
  const { workspace } = await requireWorkspace();
  const canManage = isStaffRole(workspace.role);
  const [result, clients] = await Promise.all([
    listProjects(workspace.id, params),
    listClientOptions(workspace.id),
  ]);
  const hasFilters =
    Boolean(params.q) ||
    params.status !== "all" ||
    Boolean(params.clientId) ||
    params.priority !== "all";
  const addButton = canManage ? (
    <ProjectFormSheet
      clients={clients}
      defaultCurrency={workspace.currency}
      trigger={
        <Button>
          <Plus /> Add project
        </Button>
      }
    />
  ) : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {canManage ? `Plan and track client work in ${workspace.name}.` : `Your projects with ${workspace.name}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectViewToggle params={params} />
          {canManage ? (
            <ProjectFormSheet
              clients={clients}
              defaultCurrency={workspace.currency}
              trigger={
                <Button>
                  <Plus /> Add project
                </Button>
              }
            />
          ) : null}
        </div>
      </div>

      <ProjectToolbar params={params} clients={clients} hideClientFilter={!canManage} />

      {params.view === "grid" ? (
        <ProjectGrid
          projects={result.projects}
          timeZone={workspace.timezone}
          canManage={canManage}
          clients={clients}
          defaultCurrency={workspace.currency}
          hasFilters={hasFilters}
          emptyAction={addButton}
        />
      ) : params.view === "board" ? (
        result.projects.length === 0 ? (
          <ProjectList
            projects={result.projects}
            timeZone={workspace.timezone}
            canManage={canManage}
            clients={clients}
            defaultCurrency={workspace.currency}
            hasFilters={hasFilters}
            emptyAction={addButton}
          />
        ) : (
          <ProjectBoard projects={result.projects} canManage={canManage} />
        )
      ) : (
        <ProjectList
          projects={result.projects}
          timeZone={workspace.timezone}
          canManage={canManage}
          clients={clients}
          defaultCurrency={workspace.currency}
          hasFilters={hasFilters}
          emptyAction={addButton}
        />
      )}

      <ProjectPagination
        params={params}
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
      />
    </div>
  );
}
