"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  type ClientListParams,
  clientSorts,
  clientStatusFilters,
} from "@/lib/clients/params";

const sortLabels: Record<(typeof clientSorts)[number], string> = {
  name: "Name",
  company: "Company",
  email: "Email",
  created_at: "Created",
  status: "Status",
};

const statusLabels: Record<(typeof clientStatusFilters)[number], string> = {
  all: "All statuses",
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

export function ClientToolbar({ params }: { params: ClientListParams }) {
  return (
    <form action="/clients" className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={params.q}
          placeholder="Search name, company, or email"
          className="pl-8"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Select
          name="status"
          defaultValue={params.status}
          className="w-36"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {clientStatusFilters.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </Select>
        <Select
          name="sort"
          defaultValue={params.sort}
          className="w-32"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {clientSorts.map((sort) => (
            <option key={sort} value={sort}>
              {sortLabels[sort]}
            </option>
          ))}
        </Select>
        <Select
          name="dir"
          defaultValue={params.dir}
          className="w-28"
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
