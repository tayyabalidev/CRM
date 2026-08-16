"use client";

import { Search } from "lucide-react";

import { invoiceStatusLabels } from "@/components/invoices/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { invoiceStatusFilters, type InvoiceListParams } from "@/lib/invoices/params";

export function InvoiceToolbar({
  params,
  clients,
  projects,
  hideClientFilter = false,
  hideDrafts = false,
}: {
  params: InvoiceListParams;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  hideClientFilter?: boolean;
  hideDrafts?: boolean;
}) {
  const visibleProjects = params.clientId
    ? projects.filter((project) => project.clientId === params.clientId)
    : projects;

  return (
    <form action="/invoices" className="flex flex-col gap-2">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={params.q} placeholder="Search invoice number" className="pl-8" />
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
        <Select
          name="status"
          defaultValue={params.status}
          className="w-40"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {invoiceStatusFilters
            .filter((status) => !hideDrafts || status !== "draft")
            .map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All statuses" : invoiceStatusLabels[status]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </div>
    </form>
  );
}
