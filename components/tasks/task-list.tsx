import Link from "next/link";
import type { ReactNode } from "react";
import { ListTodo } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import type { TaskFormAssignee, TaskFormProject } from "@/components/tasks/task-form-sheet";
import {
  TaskAssigneeAvatar,
  TaskDueBadge,
  TaskPriorityFlag,
  TaskProjectHeader,
  TaskStatusPill,
  groupTasksByProject,
  toFormTask,
} from "@/components/tasks/task-meta";
import { TaskRowActions } from "@/components/tasks/task-row-actions";
import { Card, CardContent } from "@/components/ui/card";
import type { TaskListItem } from "@/lib/services/tasks";
import { cn } from "@/lib/utils";

export function TaskList({
  tasks,
  timeZone,
  canManage,
  projects,
  assignees,
  emptyAction,
  hasFilters,
  variant = "list",
  noun = "task",
}: {
  tasks: TaskListItem[];
  timeZone: string;
  canManage: boolean;
  projects: TaskFormProject[];
  assignees: TaskFormAssignee[];
  emptyAction?: ReactNode;
  hasFilters: boolean;
  variant?: "list" | "table";
  noun?: "task" | "bug";
}) {
  const plural = noun === "bug" ? "bugs" : "tasks";

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<ListTodo className="size-4" />}
            title={hasFilters ? `No matching ${plural}` : `No ${plural} yet`}
            description={
              hasFilters
                ? "Try a different search or filter."
                : noun === "bug"
                  ? "Report a bug to keep it separate from regular work."
                  : "Create a task to track work across your projects."
            }
            action={hasFilters ? undefined : emptyAction}
          />
        </CardContent>
      </Card>
    );
  }

  const groups = groupTasksByProject(tasks);
  const isTable = variant === "table";

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.projectId ?? "none"} className="gap-0 py-0">
          <TaskProjectHeader group={group} noun={noun} />
          {isTable ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">{noun === "bug" ? "Bug" : "Task"}</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Due</th>
                    <th className="px-4 py-2 font-medium">Priority</th>
                    {canManage ? <th className="px-4 py-2 font-medium">Assignee</th> : null}
                    {canManage ? (
                      <th className="px-4 py-2 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {group.tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link
                          href={`/tasks/${task.id}`}
                          className={cn(
                            "font-medium hover:underline",
                            task.status === "completed" && "text-muted-foreground line-through",
                          )}
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <TaskStatusPill value={task.status} />
                      </td>
                      <td className="px-4 py-3">
                        <TaskDueBadge dueDate={task.dueDate} status={task.status} timeZone={timeZone} />
                      </td>
                      <td className="px-4 py-3">
                        <TaskPriorityFlag value={task.priority} />
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <TaskAssigneeAvatar name={task.assigneeName} />
                        </td>
                      ) : null}
                      {canManage ? (
                        <td className="px-4 py-3 text-right">
                          <TaskRowActions task={toFormTask(task)} projects={projects} assignees={assignees} />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="divide-y">
              {group.tasks.map((task) => (
                <li key={task.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40">
                  <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1 space-y-2">
                    <p
                      className={cn(
                        "font-medium",
                        task.status === "completed" && "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <TaskStatusPill value={task.status} />
                      <TaskDueBadge dueDate={task.dueDate} status={task.status} timeZone={timeZone} />
                      <TaskPriorityFlag value={task.priority} />
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    {canManage ? <TaskAssigneeAvatar name={task.assigneeName} /> : null}
                    {canManage ? (
                      <TaskRowActions task={toFormTask(task)} projects={projects} assignees={assignees} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
