"use client";

import { Search } from "lucide-react";

import { paymentMethodLabels } from "@/components/payments/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  paymentDateFilters,
  paymentMethodFilters,
  type PaymentListParams,
} from "@/lib/payments/params";

const dateLabels: Record<(typeof paymentDateFilters)[number], string> = {
  all: "Any date",
  today: "Today",
  week: "This week",
  month: "This month",
  year: "This year",
};

export function PaymentToolbar({
  params,
  clients,
  projects,
  hideClientFilter = false,
}: {
  params: PaymentListParams;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  hideClientFilter?: boolean;
}) {
  const visibleProjects = params.clientId
    ? projects.filter((project) => project.clientId === params.clientId)
    : projects;

  return (
    <form action="/payments" className="flex flex-col gap-2">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={params.q} placeholder="Search reference or notes" className="pl-8" />
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
          name="method"
          defaultValue={params.method}
          className="w-40"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {paymentMethodFilters.map((method) => (
            <option key={method} value={method}>
              {method === "all" ? "All methods" : paymentMethodLabels[method]}
            </option>
          ))}
        </Select>
        <Select
          name="date"
          defaultValue={params.date}
          className="w-36"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {paymentDateFilters.map((date) => (
            <option key={date} value={date}>
              {dateLabels[date]}
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
