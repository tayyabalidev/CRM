import Link from "next/link";

import type { ActivityItem } from "@/lib/services/activity";
import { formatDateTime } from "@/lib/utils/dates";

export function ActivityTimeline({
  items,
  timeZone,
  hideStaffLinks = false,
}: {
  items: ActivityItem[];
  timeZone: string;
  hideStaffLinks?: boolean;
}) {
  return (
    <ol className="space-y-4">
      {items.map((item) => {
        const href =
          hideStaffLinks && (item.href?.startsWith("/clients") || item.href === "/time" || item.href?.startsWith("/time/"))
            ? null
            : item.href;

        return (
        <li key={item.id} className="flex gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-foreground/70" />
          <div className="min-w-0">
            {href ? (
              <Link href={href} className="text-sm hover:underline">
                {item.message}
              </Link>
            ) : (
              <p className="text-sm">{item.message}</p>
            )}
            <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt, timeZone)}</p>
          </div>
        </li>
        );
      })}
    </ol>
  );
}
