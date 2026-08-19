import Link from "next/link";
import { Columns3, List, Table2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { taskListHref, type TaskListParams, type TaskView } from "@/lib/tasks/params";
import { cn } from "@/lib/utils";

const views: { id: TaskView; label: string; icon: typeof List }[] = [
  { id: "board", label: "Board", icon: Columns3 },
  { id: "list", label: "List", icon: List },
  { id: "table", label: "Table", icon: Table2 },
];

export function TaskViewToggle({ params, listPath = "/tasks" }: { params: TaskListParams; listPath?: string }) {
  return (
    <div className="flex rounded-lg border bg-muted/40 p-1">
      {views.map((view) => {
        const Icon = view.icon;

        return (
          <Link
            key={view.id}
            href={taskListHref(params, { view: view.id, page: 1 }, listPath)}
            aria-label={view.label}
            title={view.label}
            className={cn(
              buttonVariants({ variant: params.view === view.id ? "default" : "ghost", size: "icon-xs" }),
            )}
          >
            <Icon />
          </Link>
        );
      })}
    </div>
  );
}
