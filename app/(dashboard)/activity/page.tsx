import { Activity } from "lucide-react";

import { ActivityPagination } from "@/components/activity/activity-pagination";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { ActivityToolbar } from "@/components/activity/activity-toolbar";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { parseActivityListParams } from "@/lib/activity/params";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getActivityPageData } from "@/lib/services/activity";
import { isStaffRole } from "@/types/index";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    page?: string;
  }>;
}) {
  const params = parseActivityListParams(await searchParams);
  const { workspace } = await requireWorkspace();
  const result = await getActivityPageData(workspace.id, params);
  const staff = isStaffRole(workspace.role);
  const hasFilters = Boolean(params.q) || params.entityType !== "all";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          {staff
            ? "A timeline of clients, projects, tasks, invoices, payments, files, and notes."
            : "Activity on your projects, invoices, files, and notes."}
        </p>
      </div>

      <ActivityToolbar params={params} hideTime={!staff} hideClient={!staff} />
      <Card>
        <CardContent>
          {result.items.length === 0 ? (
            <EmptyState
              icon={<Activity className="size-4" />}
              title={hasFilters ? "No matching activity" : "No activity yet"}
              description={
                hasFilters
                  ? "Try a different search or filter."
                  : "Creates, status changes, payments, files, and notes will appear here."
              }
            />
          ) : (
            <ActivityTimeline items={result.items} timeZone={workspace.timezone} hideStaffLinks={!staff} />
          )}
        </CardContent>
      </Card>
      <ActivityPagination params={params} page={result.page} pageCount={result.pageCount} total={result.total} />
    </div>
  );
}
