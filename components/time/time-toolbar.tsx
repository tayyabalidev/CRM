"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { TimeListParams } from "@/lib/time/params";

export function TimeToolbar({
  params,
  projects,
}: {
  params: TimeListParams;
  projects: { id: string; name: string }[];
}) {
  return (
    <form action="/time" className="flex flex-col gap-2">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={params.q} placeholder="Search descriptions" className="pl-8" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Select
          name="project"
          defaultValue={params.projectId}
          className="w-40"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        <Select
          name="billable"
          defaultValue={params.billable}
          className="w-36"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="all">All time</option>
          <option value="yes">Billable</option>
          <option value="no">Non-billable</option>
        </Select>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </div>
    </form>
  );
}
