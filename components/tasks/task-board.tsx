"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Circle, CircleDashed, CircleDot, Clock3 } from "lucide-react";

import {
  TaskAssigneeAvatar,
  TaskDueBadge,
  TaskPriorityFlag,
  TaskProjectHeader,
  groupTasksByProject,
  toFormTask,
} from "@/components/tasks/task-meta";
import type { TaskFormAssignee, TaskFormProject } from "@/components/tasks/task-form-sheet";
import { TaskRowActions } from "@/components/tasks/task-row-actions";
import { Select } from "@/components/ui/select";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import { taskStatusLabels } from "@/lib/constants/status-labels";
import type { TaskListItem } from "@/lib/services/tasks";
import { cn } from "@/lib/utils";
import { taskStatuses, type TaskStatus } from "@/types/index";

const columnIcons: Record<TaskStatus, typeof Circle> = {
  backlog: CircleDashed,
  todo: Circle,
  in_progress: Clock3,
  review: CircleDot,
  completed: Check,
};

export function TaskBoard({
  tasks,
  canManage,
  timeZone,
  projects,
  assignees,
  noun = "task",
}: {
  tasks: TaskListItem[];
  canManage: boolean;
  timeZone: string;
  projects: TaskFormProject[];
  assignees: TaskFormAssignee[];
  noun?: "task" | "bug";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null);
  const groups = groupTasksByProject(tasks);
  const singleGroup = groups.length === 1 ? groups[0] : null;
  const plural = noun === "bug" ? "bugs" : "tasks";

  function moveTask(taskId: string, status: TaskStatus) {
    const current = tasks.find((task) => task.id === taskId);
    if (!canManage || !current || current.status === status) {
      return;
    }

    startTransition(async () => {
      const result = await updateTaskStatusAction(taskId, status);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      {singleGroup ? (
        <TaskProjectHeader group={singleGroup} noun={noun} />
      ) : (
        <div className="border-b px-4 py-3">
          <p className="font-medium">All projects</p>
          <p className="text-xs text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? noun : plural}
          </p>
        </div>
      )}
      <div className="flex min-h-[28rem] snap-x snap-mandatory gap-3 overflow-x-auto bg-muted/20 p-3">
        {taskStatuses.map((status) => {
          const column = tasks.filter((task) => task.status === status);
          const Icon = columnIcons[status];

          return (
            <div
              key={status}
              onDragOver={(event) => {
                if (!canManage) {
                  return;
                }
                event.preventDefault();
                setOverStatus(status);
              }}
              onDragLeave={() => {
                if (overStatus === status) {
                  setOverStatus(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = event.dataTransfer.getData("text/plain");
                setOverStatus(null);
                setDraggingId(null);

                if (!taskId) {
                  return;
                }

                moveTask(taskId, status);
              }}
              className={cn(
                "flex w-[min(17rem,calc(100vw-4rem))] shrink-0 snap-start flex-col rounded-lg border bg-background/80 sm:w-64",
                overStatus === status && "ring-2 ring-ring",
              )}
            >
              <header className="flex items-center gap-2 px-3 py-2">
                <Icon className="size-3.5 text-muted-foreground" />
                <h2 className="text-sm font-medium">{taskStatusLabels[status]}</h2>
                <span className="ml-auto text-xs text-muted-foreground">{column.length}</span>
              </header>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {column.map((task) => (
                  <article
                    key={task.id}
                    draggable={canManage && !pending}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", task.id);
                      event.dataTransfer.effectAllowed = "move";
                      setDraggingId(task.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setOverStatus(null);
                    }}
                    className={cn(
                      "rounded-lg border bg-card p-3 shadow-xs",
                      draggingId === task.id && "opacity-50",
                      canManage && "cursor-grab active:cursor-grabbing",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1 space-y-2">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            task.status === "completed" && "text-muted-foreground line-through",
                          )}
                        >
                          {task.title}
                        </p>
                        {singleGroup ? null : (
                          <p className="truncate text-xs text-muted-foreground">
                            {task.projectName ?? "No project"}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          {canManage ? <TaskAssigneeAvatar name={task.assigneeName} /> : null}
                          {task.dueDate ? (
                            <TaskDueBadge dueDate={task.dueDate} status={task.status} timeZone={timeZone} />
                          ) : null}
                          <TaskPriorityFlag value={task.priority} />
                        </div>
                      </Link>
                      {canManage ? (
                        <div onPointerDown={(event) => event.stopPropagation()}>
                          <TaskRowActions task={toFormTask(task)} projects={projects} assignees={assignees} />
                        </div>
                      ) : null}
                    </div>
                    {canManage ? (
                      <Select
                        aria-label={`Move ${task.title}`}
                        className="mt-2 md:hidden"
                        value={task.status}
                        disabled={pending}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          moveTask(task.id, event.target.value as TaskStatus);
                        }}
                      >
                        {taskStatuses.map((option) => (
                          <option key={option} value={option}>
                            {taskStatusLabels[option]}
                          </option>
                        ))}
                      </Select>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
