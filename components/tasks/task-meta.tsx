import Link from "next/link";
import type { ReactNode } from "react";
import { Calendar, Flag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { priorityLabels, taskStatusLabels } from "@/lib/constants/status-labels";
import type { TaskListItem } from "@/lib/services/tasks";
import { cn } from "@/lib/utils";
import { formatDayLabel, isOverdue } from "@/lib/utils/dates";
import type { Priority, TaskStatus } from "@/types/index";

export type TaskProjectGroup = {
  projectId: string | null;
  projectName: string;
  tasks: TaskListItem[];
};

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

const taskStatusTone: Record<TaskStatus, string> = {
  backlog: "border-transparent bg-muted text-muted-foreground",
  todo: "border-transparent bg-muted text-foreground/80",
  in_progress: "border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-200",
  review: "border-transparent bg-sky-500/10 text-sky-800 dark:text-sky-200",
  completed: "border-transparent bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
};

const priorityTone: Record<Priority, string> = {
  low: "border-transparent bg-sky-500/10 text-sky-800 dark:text-sky-200",
  medium: "border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-200",
  high: "border-transparent bg-red-500/10 text-red-800 dark:text-red-200",
  urgent: "border-transparent bg-red-500/10 text-red-800 dark:text-red-200",
};

export function groupTasksByProject(tasks: TaskListItem[]): TaskProjectGroup[] {
  const order: string[] = [];
  const map = new Map<string, TaskProjectGroup>();

  for (const task of tasks) {
    const key = task.projectId ?? "none";
    let group = map.get(key);

    if (!group) {
      group = {
        projectId: task.projectId,
        projectName: task.projectName ?? "No project",
        tasks: [],
      };
      map.set(key, group);
      order.push(key);
    }

    group.tasks.push(task);
  }

  const groups = order.map((key) => map.get(key)!);
  const named = groups.filter((group) => group.projectId);
  const ungrouped = groups.filter((group) => !group.projectId);
  return [...named, ...ungrouped];
}

export function personInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function TaskStatusPill({ value }: { value: TaskStatus }) {
  return (
    <Badge variant="outline" className={taskStatusTone[value]}>
      {taskStatusLabels[value]}
    </Badge>
  );
}

export function TaskPriorityFlag({ value }: { value: Priority }) {
  return (
    <Badge variant="outline" className={cn("gap-1", priorityTone[value])}>
      <Flag className="size-3" />
      {priorityLabels[value]}
    </Badge>
  );
}

export function TaskDueBadge({
  dueDate,
  status,
  timeZone,
}: {
  dueDate: string | null;
  status: TaskStatus;
  timeZone: string;
}) {
  if (!dueDate) {
    return <span className="text-xs text-muted-foreground">No due date</span>;
  }

  const overdue = status !== "completed" && isOverdue(dueDate, timeZone);

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        overdue
          ? "border-transparent bg-red-500/10 text-red-800 dark:text-red-200"
          : "border-transparent bg-muted text-muted-foreground",
      )}
    >
      <Calendar className="size-3" />
      {formatDayLabel(dueDate, timeZone)}
    </Badge>
  );
}

export function TaskAssigneeAvatar({ name }: { name: string | null }) {
  if (!name) {
    return (
      <Avatar size="sm" title="Unassigned">
        <AvatarFallback>—</AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar size="sm" title={name}>
      <AvatarFallback>{personInitials(name)}</AvatarFallback>
    </Avatar>
  );
}

export function TaskProjectHeader({
  group,
  actions,
}: {
  group: TaskProjectGroup;
  actions?: ReactNode;
}) {
  const count = `${group.tasks.length} ${group.tasks.length === 1 ? "task" : "tasks"}`;

  return (
    <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
      <div className="min-w-0">
        {group.projectId ? (
          <Link href={`/projects/${group.projectId}`} className="truncate font-medium hover:underline">
            {group.projectName}
          </Link>
        ) : (
          <p className="truncate font-medium">{group.projectName}</p>
        )}
        <p className="text-xs text-muted-foreground">{count}</p>
      </div>
      {actions}
    </div>
  );
}
