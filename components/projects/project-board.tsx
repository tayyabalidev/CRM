"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ProgressBar } from "@/components/dashboard/progress-bar";
import { PriorityBadge } from "@/components/dashboard/status-badge";
import { projectStatusLabels } from "@/lib/constants/status-labels";
import { Select } from "@/components/ui/select";
import { updateProjectStatusAction } from "@/lib/actions/projects";
import type { ProjectListItem } from "@/lib/services/projects";
import { cn } from "@/lib/utils";
import { projectStatuses, type ProjectStatus } from "@/types/index";

export function ProjectBoard({
  projects,
  canManage,
}: {
  projects: ProjectListItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<ProjectStatus | null>(null);

  function moveProject(projectId: string, status: ProjectStatus) {
    const current = projects.find((project) => project.id === projectId);
    if (!canManage || !current || current.status === status) {
      return;
    }

    startTransition(async () => {
      const result = await updateProjectStatusAction(projectId, status);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="-mx-1 flex min-h-[28rem] snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
      {projectStatuses.map((status) => {
        const column = projects.filter((project) => project.status === status);

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
              const projectId = event.dataTransfer.getData("text/plain");
              setOverStatus(null);
              setDraggingId(null);

              if (!projectId) {
                return;
              }

              moveProject(projectId, status);
            }}
            className={cn(
              "flex w-[min(18rem,calc(100vw-3rem))] shrink-0 snap-start flex-col rounded-xl border bg-muted/20 sm:w-72",
              overStatus === status && "ring-2 ring-ring",
            )}
          >
            <header className="flex items-center justify-between px-3 py-2">
              <h2 className="text-sm font-medium">{projectStatusLabels[status]}</h2>
              <span className="text-xs text-muted-foreground">{column.length}</span>
            </header>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {column.map((project) => (
                <article
                  key={project.id}
                  draggable={canManage && !pending}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", project.id);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingId(project.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setOverStatus(null);
                  }}
                  className={cn(
                    "rounded-lg border bg-card p-3 shadow-xs",
                    draggingId === project.id && "opacity-50",
                    canManage && "cursor-grab active:cursor-grabbing",
                  )}
                >
                  <Link href={`/projects/${project.id}`} className="block space-y-2">
                    <p className="text-sm font-medium">{project.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{project.clientName}</p>
                    <ProgressBar value={project.progress} />
                    <PriorityBadge value={project.priority} />
                  </Link>
                  {canManage ? (
                    <Select
                      aria-label={`Move ${project.name}`}
                      className="mt-2 md:hidden"
                      value={project.status}
                      disabled={pending}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        moveProject(project.id, event.target.value as ProjectStatus);
                      }}
                    >
                      {projectStatuses.map((option) => (
                        <option key={option} value={option}>
                          {projectStatusLabels[option]}
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
