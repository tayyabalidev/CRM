import { Plus } from "lucide-react";

import { TimeEntryFormSheet } from "@/components/time/time-entry-form-sheet";
import { TimeEntryList } from "@/components/time/time-entry-list";
import { TimePagination } from "@/components/time/time-pagination";
import { TimeSummary } from "@/components/time/time-summary";
import { TimeToolbar } from "@/components/time/time-toolbar";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth/workspace";
import { listProjectOptions } from "@/lib/services/projects";
import { getTimePageData } from "@/lib/services/time";
import { parseTimeListParams } from "@/lib/time/params";

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    project?: string;
    billable?: string;
    page?: string;
  }>;
}) {
  const params = parseTimeListParams(await searchParams);
  const { workspace, user } = await requireStaff();
  const [result, projects] = await Promise.all([
    getTimePageData(workspace.id, user.id, workspace.timezone, params),
    listProjectOptions(workspace.id, params.projectId || undefined),
  ]);
  const projectOptions = projects.map((project) => ({ id: project.id, name: project.name }));
  const hasFilters = Boolean(params.q) || Boolean(params.projectId) || params.billable !== "all";
  const addButton = (
    <TimeEntryFormSheet
      projects={projectOptions}
      defaultProjectId={params.projectId || undefined}
      trigger={
        <Button>
          <Plus /> Add entry
        </Button>
      }
    />
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Time</h1>
          <p className="text-sm text-muted-foreground">
            Start a timer from the header, or record hours against projects and tasks.
          </p>
        </div>
        {addButton}
      </div>

      <TimeSummary summary={result.summary} />
      <TimeToolbar params={params} projects={projectOptions} />
      <TimeEntryList
        entries={result.entries}
        timeZone={workspace.timezone}
        currency={workspace.currency}
        canManage
        projects={projectOptions}
        hasFilters={hasFilters}
        emptyAction={addButton}
      />
      <TimePagination params={params} page={result.page} pageCount={result.pageCount} total={result.total} />
    </div>
  );
}
