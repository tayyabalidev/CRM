import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Priority, ProjectStatus, TaskStatus } from "@/types/index";

export const projectStatusLabels: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  completed: "Completed",
};

export const priorityLabels: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export function StatusBadge({
  value,
}: {
  value: ProjectStatus | TaskStatus;
}) {
  const label =
    value in projectStatusLabels
      ? projectStatusLabels[value as ProjectStatus]
      : taskStatusLabels[value as TaskStatus];
  const muted = value === "completed" || value === "cancelled" || value === "backlog";

  return (
    <Badge variant="outline" className={cn(muted && "text-muted-foreground")}>
      {label}
    </Badge>
  );
}

export function PriorityBadge({ value }: { value: Priority }) {
  return (
    <Badge
      variant={value === "urgent" || value === "high" ? "destructive" : "secondary"}
      className="capitalize"
    >
      {priorityLabels[value]}
    </Badge>
  );
}
