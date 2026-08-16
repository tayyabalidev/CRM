import Link from "next/link";
import { ListTodo } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PriorityBadge, StatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardTask } from "@/lib/services/dashboard";
import { formatTime } from "@/lib/utils/dates";

export function TodayTasks({
  tasks,
  timeZone,
}: {
  tasks: DashboardTask[];
  timeZone: string;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Today&apos;s tasks</CardTitle>
          <CardDescription>Due today, still open.</CardDescription>
        </div>
        <Link href="/tasks" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <EmptyState
            icon={<ListTodo className="size-4" />}
            title="Nothing due today"
            description="Tasks with a due date of today will appear here."
          />
        ) : (
          <ul className="divide-y">
            {tasks.map((task) => (
              <li key={task.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {task.projectName ?? "No project"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge value={task.priority} />
                  <StatusBadge value={task.status} />
                  <span className="text-xs text-muted-foreground">
                    {task.dueDate ? formatTime(task.dueDate, timeZone) : "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
