"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { priorityLabels, projectStatusLabels } from "@/components/dashboard/status-badge";
import type { ProjectFormClient } from "@/components/projects/project-form-sheet";
import {
  type ProjectListParams,
  projectPriorityFilters,
  projectSorts,
  projectStatusFilters,
} from "@/lib/projects/params";

const sortLabels: Record<(typeof projectSorts)[number], string> = {
  name: "Name",
  due_date: "Due date",
  created_at: "Created",
  status: "Status",
  priority: "Priority",
};

export function ProjectToolbar({
  params,
  clients,
  hideClientFilter = false,
}: {
  params: ProjectListParams;
  clients: ProjectFormClient[];
  hideClientFilter?: boolean;
}) {
  return (
    <form action="/projects" className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <input type="hidden" name="view" value={params.view} />
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={params.q}
          placeholder="Search projects"
          className="pl-8"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Select
          name="status"
          defaultValue={params.status}
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-36 sm:flex-none sm:basis-auto"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {projectStatusFilters.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All statuses" : projectStatusLabels[status]}
            </option>
          ))}
        </Select>
        {hideClientFilter ? null : (
        <Select
          name="client"
          defaultValue={params.clientId}
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-40 sm:flex-none sm:basis-auto"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">All clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
        )}
        <Select
          name="priority"
          defaultValue={params.priority}
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-32 sm:flex-none sm:basis-auto"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {projectPriorityFilters.map((priority) => (
            <option key={priority} value={priority}>
              {priority === "all" ? "All priorities" : priorityLabels[priority]}
            </option>
          ))}
        </Select>
        <Select
          name="sort"
          defaultValue={params.sort}
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-32 sm:flex-none sm:basis-auto"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {projectSorts.map((sort) => (
            <option key={sort} value={sort}>
              {sortLabels[sort]}
            </option>
          ))}
        </Select>
        <Select
          name="dir"
          defaultValue={params.dir}
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-28 sm:flex-none sm:basis-auto"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </Select>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </div>
    </form>
  );
}
