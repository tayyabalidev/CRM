import { CalendarClock } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardDeadline } from "@/lib/services/dashboard";
import { formatDate } from "@/lib/utils/dates";

export function UpcomingDeadlines({
  deadlines,
  timeZone,
}: {
  deadlines: DashboardDeadline[];
  timeZone: string;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Upcoming deadlines</CardTitle>
        <CardDescription>The next project and task due dates.</CardDescription>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="size-4" />}
            title="No upcoming deadlines"
            description="Due dates on projects and tasks will show up here."
          />
        ) : (
          <ul className="space-y-3">
            {deadlines.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.dueDate, timeZone)}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {item.type}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
