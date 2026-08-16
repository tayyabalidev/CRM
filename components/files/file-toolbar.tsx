"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { FileListParams } from "@/lib/files/params";

export function FileToolbar({
  params,
  clients,
  projects,
  tasks,
  invoices,
  hideClientFilter = false,
}: {
  params: FileListParams;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  tasks: { id: string; title: string; projectId: string | null; clientId: string | null }[];
  invoices: { id: string; invoiceNumber: string; clientId: string; projectId: string | null }[];
  hideClientFilter?: boolean;
}) {
  const visibleProjects = params.clientId
    ? projects.filter((project) => project.clientId === params.clientId)
    : projects;
  const visibleTasks = params.projectId
    ? tasks.filter((task) => task.projectId === params.projectId)
    : params.clientId
      ? tasks.filter((task) => task.clientId === params.clientId)
      : tasks;
  const visibleInvoices = invoices.filter((invoice) => {
    if (params.clientId && invoice.clientId !== params.clientId) {
      return false;
    }

    if (params.projectId && invoice.projectId && invoice.projectId !== params.projectId) {
      return false;
    }

    return true;
  });

  return (
    <form action="/files" className="flex flex-col gap-2">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={params.q} placeholder="Search file names" className="pl-8" />
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
          name="task"
          defaultValue={params.taskId}
          className="w-40"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">All tasks</option>
          {visibleTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </Select>
        <Select
          name="invoice"
          defaultValue={params.invoiceId}
          className="w-40"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">All invoices</option>
          {visibleInvoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.invoiceNumber}
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
