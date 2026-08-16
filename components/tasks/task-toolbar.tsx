"use client";

import { Search } from "lucide-react";

import { priorityLabels, taskStatusLabels } from "@/components/dashboard/status-badge";
import type { TaskFormAssignee, TaskFormProject } from "@/components/tasks/task-form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  type TaskListParams,
  taskDueFilters,
  taskPriorityFilters,
  taskSorts,
  taskStatusFilters,
} from "@/lib/tasks/params";

const sortLabels: Record<(typeof taskSorts)[number], string> = {
  due_date: "Due date",
  created_at: "Created",
  title: "Title",
  priority: "Priority",
  status: "Status",
};

const dueLabels: Record<(typeof taskDueFilters)[number], string> = {
  all: "Any due date",
  overdue: "Overdue",
  today: "Due today",
  upcoming: "Upcoming",
  none: "No due date",
};

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
  return (
    <form action="/tasks" className="flex flex-col gap-2">
      <input type="hidden" name="view" value={params.view} />
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={params.q} placeholder="Search tasks" className="pl-8" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Select
          name="status"
          defaultValue={params.status}
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-36 sm:flex-none sm:basis-auto"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {taskStatusFilters.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All statuses" : taskStatusLabels[status]}
            </option>
          ))}
        </Select>
        <Select
          name="priority"
          defaultValue={params.priority}
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-32 sm:flex-none sm:basis-auto"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {taskPriorityFilters.map((priority) => (
            <option key={priority} value={priority}>
              {priority === "all" ? "All priorities" : priorityLabels[priority]}
            </option>
          ))}
        </Select>
        <Select
          name="project"
          defaultValue={params.projectId}
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-40 sm:flex-none sm:basis-auto"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        {hideAssignees ? null : (
        <Select
          name="assignee"
          defaultValue={params.assigneeId}
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-40 sm:flex-none sm:basis-auto"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.name}
            </option>
          ))}
        </Select>
        )}
        <Select
          name="due"
          defaultValue={params.due}
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-36 sm:flex-none sm:basis-auto"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {taskDueFilters.map((due) => (
            <option key={due} value={due}>
              {dueLabels[due]}
            </option>
          ))}
        </Select>
        <Select
          name="sort"
          defaultValue={params.sort}
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-32 sm:flex-none sm:basis-auto"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {taskSorts.map((sort) => (
            <option key={sort} value={sort}>
              {sortLabels[sort]}
            </option>
          ))}
        </Select>
        <Select
          name="dir"
          defaultValue={params.dir}
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-28 sm:flex-none sm:basis-auto"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </Select>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </div>
    </form>
  );
}
