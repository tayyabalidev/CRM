"use client";

import { Search } from "lucide-react";

import { noteVisibilityLabels } from "@/components/notes/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { noteVisibilityFilters, type NoteListParams } from "@/lib/notes/params";

export function NoteToolbar({
  params,
  clients,
  projects,
  hideClientFilter = false,
  hideVisibility = false,
}: {
  params: NoteListParams;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  hideClientFilter?: boolean;
  hideVisibility?: boolean;
}) {
  const visibleProjects = params.clientId
    ? projects.filter((project) => project.clientId === params.clientId)
    : projects;

  return (
    <form action="/notes" className="flex flex-col gap-2">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={params.q} placeholder="Search titles or content" className="pl-8" />
      </div>
      <div className="flex flex-wrap gap-2">
        {hideClientFilter ? null : (
        <Select
          name="client"
          defaultValue={params.clientId}
          className="w-40"
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
          name="project"
          defaultValue={params.projectId}
          className="w-40"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">All projects</option>
          {visibleProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        {hideVisibility ? null : (
        <Select
          name="visibility"
          defaultValue={params.visibility}
          className="w-40"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {noteVisibilityFilters.map((value) => (
            <option key={value} value={value}>
              {value === "all" ? "All visibility" : noteVisibilityLabels[value]}
            </option>
          ))}
        </Select>
        )}
        <Button type="submit" variant="outline">
          Search
        </Button>
      </div>
    </form>
  );
}
