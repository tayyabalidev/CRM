import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClientStatus } from "@/types/index";

const labels: Record<ClientStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

export function ClientStatusBadge({ value }: { value: ClientStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(value !== "active" && "text-muted-foreground")}
    >
      {labels[value]}
    </Badge>
  );
}
