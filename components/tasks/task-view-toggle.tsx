import Link from "next/link";
import { Columns3, List } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { taskListHref, type TaskListParams, type TaskView } from "@/lib/tasks/params";
import { cn } from "@/lib/utils";

const views: { id: TaskView; label: string; icon: typeof List }[] = [
  { id: "list", label: "List", icon: List },
  { id: "board", label: "Board", icon: Columns3 },
];

export function TaskViewToggle({ params }: { params: TaskListParams }) {
  return (
    <div className="flex rounded-lg border bg-muted/40 p-1">
      {views.map((view) => {
        const Icon = view.icon;

        return (
          <Link
            key={view.id}
            href={taskListHref(params, { view: view.id, page: 1 })}
            aria-label={view.label}
            className={cn(
              buttonVariants({ variant: params.view === view.id ? "default" : "ghost", size: "xs" }),
              "gap-1.5",
            )}
          >
            <Icon />
            <span className="hidden sm:inline">{view.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
