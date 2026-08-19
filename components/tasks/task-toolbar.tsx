"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { TaskFilterSheet } from "@/components/tasks/task-filter-sheet";
import { TaskViewToggle } from "@/components/tasks/task-view-toggle";
import type { TaskFormAssignee, TaskFormProject } from "@/components/tasks/task-form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { taskListHref, type TaskListParams } from "@/lib/tasks/params";

export function TaskToolbar({
  params,
  projects,
  assignees,
  hideAssignees = false,
}: {
  params: TaskListParams;
  projects: TaskFormProject[];
  assignees: TaskFormAssignee[];
  hideAssignees?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <form action="/tasks" className="relative min-w-0 flex-1">
        <input type="hidden" name="view" value={params.view} />
        {params.hideComplete ? <input type="hidden" name="hide" value="complete" /> : null}
        {params.status !== "all" ? <input type="hidden" name="status" value={params.status} /> : null}
        {params.priority !== "all" ? <input type="hidden" name="priority" value={params.priority} /> : null}
        {params.projectId ? <input type="hidden" name="project" value={params.projectId} /> : null}
        {params.assigneeId ? <input type="hidden" name="assignee" value={params.assigneeId} /> : null}
        {params.due !== "all" ? <input type="hidden" name="due" value={params.due} /> : null}
        {params.sort !== "due_date" ? <input type="hidden" name="sort" value={params.sort} /> : null}
        {params.dir !== "asc" ? <input type="hidden" name="dir" value={params.dir} /> : null}
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={params.q} placeholder="Search tasks" className="pl-8" />
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <Label className="gap-2 text-sm font-normal text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 rounded border"
            checked={params.hideComplete}
            onChange={() => {
              router.push(taskListHref(params, { hideComplete: !params.hideComplete, page: 1 }));
            }}
          />
          Hide complete
        </Label>
        <TaskViewToggle params={params} />
        <TaskFilterSheet
          params={params}
          projects={projects}
          assignees={assignees}
          hideAssignees={hideAssignees}
        />
      </div>
    </div>
  );
}
