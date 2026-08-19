"use client";

import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";

import { priorityLabels, taskStatusLabels } from "@/lib/constants/status-labels";
import type { TaskFormAssignee, TaskFormProject } from "@/components/tasks/task-form-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  hasTaskSheetFilters,
  resetTaskSheetFilters,
  taskDueFilters,
  taskDueLabels,
  taskListHref,
  taskPriorityFilters,
  taskSortLabels,
  taskSorts,
  taskStatusFilters,
  type TaskListParams,
} from "@/lib/tasks/params";
import { cn } from "@/lib/utils";

export function TaskFilterSheet({
  params,
  projects,
  assignees,
  hideAssignees = false,
  listPath = "/tasks",
}: {
  params: TaskListParams;
  projects: TaskFormProject[];
  assignees: TaskFormAssignee[];
  hideAssignees?: boolean;
  listPath?: string;
}) {
  const active = hasTaskSheetFilters(params);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Apply filters" className="relative">
          <SlidersHorizontal />
          {active ? (
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-foreground" />
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-md">
        <form action={listPath}>
          <input type="hidden" name="view" value={params.view} />
          <input type="hidden" name="q" value={params.q} />
          {params.hideComplete ? <input type="hidden" name="hide" value="complete" /> : null}
          <DialogHeader className="flex-row items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Close">
                  <X />
                </Button>
              </DialogClose>
              <DialogTitle>Apply filters</DialogTitle>
            </div>
            <Link
              href={taskListHref(resetTaskSheetFilters(params), {}, listPath)}
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0")}
            >
              Reset all
            </Link>
          </DialogHeader>
          <div className="space-y-3 px-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-filter-sort">Sort by</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select id="task-filter-sort" name="sort" defaultValue={params.sort}>
                  {taskSorts.map((sort) => (
                    <option key={sort} value={sort}>
                      {taskSortLabels[sort]}
                    </option>
                  ))}
                </Select>
                <Select name="dir" defaultValue={params.dir} aria-label="Sort direction">
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-filter-project">Project</Label>
              <Select id="task-filter-project" name="project" defaultValue={params.projectId}>
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
            {hideAssignees ? null : (
              <div className="space-y-1.5">
                <Label htmlFor="task-filter-assignee">Assigned to</Label>
                <Select id="task-filter-assignee" name="assignee" defaultValue={params.assigneeId}>
                  <option value="">All assignees</option>
                  <option value="unassigned">Unassigned</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="task-filter-priority">Priority</Label>
              <Select id="task-filter-priority" name="priority" defaultValue={params.priority}>
                {taskPriorityFilters.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority === "all" ? "All priorities" : priorityLabels[priority]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-filter-status">Status</Label>
              <Select id="task-filter-status" name="status" defaultValue={params.status}>
                {taskStatusFilters.map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "All statuses" : taskStatusLabels[status]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-filter-due">Due date</Label>
              <Select id="task-filter-due" name="due" defaultValue={params.due}>
                {taskDueFilters.map((due) => (
                  <option key={due} value={due}>
                    {taskDueLabels[due]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-row justify-between border-t px-4 py-3 sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Apply</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
