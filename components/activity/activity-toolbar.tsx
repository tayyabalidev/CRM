"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  activityEntityFilters,
  activityEntityLabels,
  type ActivityListParams,
} from "@/lib/activity/params";

export function ActivityToolbar({
  params,
  hideTime = false,
  hideClient = false,
}: {
  params: ActivityListParams;
  hideTime?: boolean;
  hideClient?: boolean;
}) {
  return (
    <form action="/activity" className="flex flex-col gap-2">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={params.q} placeholder="Search activity" className="pl-8" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Select
          name="type"
          defaultValue={params.entityType}
          className="w-40"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {activityEntityFilters
            .filter((value) => {
              if (hideTime && value === "time_entry") {
                return false;
              }
              if (hideClient && value === "client") {
                return false;
              }
              return true;
            })
            .map((value) => (
            <option key={value} value={value}>
              {activityEntityLabels[value]}
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
