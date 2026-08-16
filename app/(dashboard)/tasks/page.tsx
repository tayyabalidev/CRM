import { Plus } from "lucide-react";

import { TaskBoard } from "@/components/tasks/task-board";
import { TaskFormSheet } from "@/components/tasks/task-form-sheet";
import { TaskList } from "@/components/tasks/task-list";
import { TaskPagination } from "@/components/tasks/task-pagination";
import { TaskToolbar } from "@/components/tasks/task-toolbar";
import { TaskViewToggle } from "@/components/tasks/task-view-toggle";
import { Button } from "@/components/ui/button";
import { requireWorkspace } from "@/lib/auth/workspace";
import { parseTaskListParams } from "@/lib/tasks/params";
import { listProjectOptions } from "@/lib/services/projects";
import { listAssigneeOptions, listTasks } from "@/lib/services/tasks";
import { isStaffRole } from "@/types/index";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    project?: string;
    assignee?: string;
    due?: string;
    sort?: string;
    dir?: string;
    page?: string;
    view?: string;
  }>;
}) {
  const params = parseTaskListParams(await searchParams);
  const { workspace } = await requireWorkspace();
  const canManage = isStaffRole(workspace.role);
  const [result, projects, assignees] = await Promise.all([
    listTasks(workspace.id, params, workspace.timezone),
    listProjectOptions(workspace.id, params.projectId || undefined),
    canManage ? listAssigneeOptions(workspace.id) : Promise.resolve([]),
  ]);
  const hasFilters =
    Boolean(params.q) ||
    params.status !== "all" ||
    params.priority !== "all" ||
    Boolean(params.projectId) ||
    Boolean(params.assigneeId) ||
    params.due !== "all";
  const addButton = canManage ? (
    <TaskFormSheet
      projects={projects}
      assignees={assignees}
      defaultProjectId={params.projectId || undefined}
      trigger={
        <Button>
          <Plus /> Add task
        </Button>
      }
    />
  ) : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? `Assign work and move it across the board in ${workspace.name}.`
              : `Tasks on your projects with ${workspace.name}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TaskViewToggle params={params} />
          {canManage ? (
            <TaskFormSheet
              projects={projects}
              assignees={assignees}
              defaultProjectId={params.projectId || undefined}
              trigger={
                <Button>
                  <Plus /> Add task
                </Button>
              }
            />
          ) : null}
        </div>
      </div>

      <TaskToolbar params={params} projects={projects} assignees={assignees} hideAssignees={!canManage} />

      {params.view === "board" ? (
        result.tasks.length === 0 ? (
          <TaskList
            tasks={result.tasks}
            timeZone={workspace.timezone}
            canManage={canManage}
            projects={projects}
            assignees={assignees}
            hasFilters={hasFilters}
            emptyAction={addButton}
          />
        ) : (
          <TaskBoard tasks={result.tasks} canManage={canManage} />
        )
      ) : (
        <TaskList
          tasks={result.tasks}
          timeZone={workspace.timezone}
          canManage={canManage}
          projects={projects}
          assignees={assignees}
          hasFilters={hasFilters}
          emptyAction={addButton}
        />
      )}

      <TaskPagination
        params={params}
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
      />
    </div>
  );
}
