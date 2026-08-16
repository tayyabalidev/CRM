"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PriorityBadge, taskStatusLabels } from "@/components/dashboard/status-badge";
import { Select } from "@/components/ui/select";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import type { TaskListItem } from "@/lib/services/tasks";
import { cn } from "@/lib/utils";
import { taskStatuses, type TaskStatus } from "@/types/index";

export function TaskBoard({ tasks, canManage }: { tasks: TaskListItem[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null);

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
    <div className="-mx-1 flex min-h-[28rem] snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
      {taskStatuses.map((status) => {
        const column = tasks.filter((task) => task.status === status);

        return (
          <section
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
              "flex w-[min(18rem,calc(100vw-3rem))] shrink-0 snap-start flex-col rounded-xl border bg-muted/20 sm:w-72",
              overStatus === status && "ring-2 ring-ring",
            )}
          >
            <header className="flex items-center justify-between px-3 py-2">
              <h2 className="text-sm font-medium">{taskStatusLabels[status]}</h2>
              <span className="text-xs text-muted-foreground">{column.length}</span>
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
                  <Link href={`/tasks/${task.id}`} className="block space-y-2">
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {task.projectName ?? "No project"}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <PriorityBadge value={task.priority} />
                      {canManage ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {task.assigneeName ?? "Unassigned"}
                        </span>
                      ) : null}
                    </div>
                  </Link>
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
          </section>
        );
      })}
    </div>
  );
}
