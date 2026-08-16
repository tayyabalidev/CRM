import Link from "next/link";
import { Activity } from "lucide-react";

import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardActivity } from "@/lib/services/dashboard";

export function RecentActivity({
  items,
  timeZone,
  portal = false,
}: {
  items: DashboardActivity[];
  timeZone: string;
  portal?: boolean;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          {portal ? "Latest changes on your work." : "Latest changes across this workspace."}
        </CardDescription>
        <CardAction>
          <Link href="/activity" className="text-xs text-muted-foreground hover:underline">
            View all
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={<Activity className="size-4" />}
            title="No activity yet"
            description="New clients, projects, invoices, and payments will appear in this timeline."
          />
        ) : (
          <ActivityTimeline items={items} timeZone={timeZone} hideStaffLinks={portal} />
        )}
      </CardContent>
    </Card>
  );
}
