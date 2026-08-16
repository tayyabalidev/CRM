import Link from "next/link";
import type { ReactNode } from "react";
import { ListTodo } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PriorityBadge, StatusBadge } from "@/components/dashboard/status-badge";
import type { TaskFormAssignee, TaskFormProject } from "@/components/tasks/task-form-sheet";
import { TaskRowActions } from "@/components/tasks/task-row-actions";
import { Card, CardContent } from "@/components/ui/card";
import type { TaskListItem } from "@/lib/services/tasks";
import { formatDate, formatTime } from "@/lib/utils/dates";

export function toFormTask(task: TaskListItem) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    projectId: task.projectId,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.status,
    estimatedMinutes: task.estimatedMinutes,
  };
}

export function TaskList({
  tasks,
  timeZone,
  canManage,
  projects,
  assignees,
  emptyAction,
  hasFilters,
}: {
  tasks: TaskListItem[];
  timeZone: string;
  canManage: boolean;
  projects: TaskFormProject[];
  assignees: TaskFormAssignee[];
  emptyAction?: ReactNode;
  hasFilters: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<ListTodo className="size-4" />}
            title={hasFilters ? "No matching tasks" : "No tasks yet"}
            description={
              hasFilters
                ? "Try a different search or filter."
                : "Create a task to track work across your projects."
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
        {tasks.map((task) => (
          <Card key={task.id} size="sm">
            <CardContent className="flex items-start justify-between gap-3">
              <Link href={`/tasks/${task.id}`} className="min-w-0 space-y-1">
                <p className="truncate font-medium">{task.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {task.projectName ?? "No project"}
                  {canManage && task.assigneeName ? ` · ${task.assigneeName}` : ""}
                </p>
                <div className="flex flex-wrap gap-1">
                  <StatusBadge value={task.status} />
                  <PriorityBadge value={task.priority} />
                </div>
              </Link>
              {canManage ? (
                <TaskRowActions task={toFormTask(task)} projects={projects} assignees={assignees} />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden min-w-0 md:block">
        <CardContent className="overflow-x-auto px-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Task</th>
                <th className="px-4 py-2 font-medium">Project</th>
                {canManage ? <th className="px-4 py-2 font-medium">Assignee</th> : null}
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Due</th>
                {canManage ? (
                  <th className="px-4 py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/tasks/${task.id}`} className="font-medium hover:underline">
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{task.projectName ?? "—"}</td>
                  {canManage ? (
                    <td className="px-4 py-3 text-muted-foreground">{task.assigneeName ?? "Unassigned"}</td>
                  ) : null}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge value={task.status} />
                      <PriorityBadge value={task.priority} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {task.dueDate ? `${formatDate(task.dueDate, timeZone)} ${formatTime(task.dueDate, timeZone)}` : "—"}
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3 text-right">
                      <TaskRowActions task={toFormTask(task)} projects={projects} assignees={assignees} />
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
