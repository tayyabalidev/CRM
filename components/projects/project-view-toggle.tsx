import Link from "next/link";
import { Columns3, LayoutGrid, List } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { projectListHref, type ProjectListParams, type ProjectView } from "@/lib/projects/params";
import { cn } from "@/lib/utils";

const views: { id: ProjectView; label: string; icon: typeof List }[] = [
  { id: "list", label: "List", icon: List },
  { id: "grid", label: "Grid", icon: LayoutGrid },
  { id: "board", label: "Board", icon: Columns3 },
];

export function ProjectViewToggle({ params }: { params: ProjectListParams }) {
  return (
    <div className="flex rounded-lg border bg-muted/40 p-1">
      {views.map((view) => {
        const Icon = view.icon;

        return (
          <Link
            key={view.id}
            href={projectListHref(params, { view: view.id, page: 1 })}
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
