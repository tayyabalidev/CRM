import { Badge } from "@/components/ui/badge";
import {
  priorityLabels,
  projectStatusLabels,
  taskStatusLabels,
} from "@/lib/constants/status-labels";
import { cn } from "@/lib/utils";
import type { Priority, ProjectStatus, TaskStatus } from "@/types/index";

export { priorityLabels, projectStatusLabels, taskStatusLabels };

export function StatusBadge({
  value,
}: {
  value: ProjectStatus | TaskStatus;
}) {
  const label =
    value in projectStatusLabels
      ? projectStatusLabels[value as ProjectStatus]
      : (taskStatusLabels[value as TaskStatus] ?? value);
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
