"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useState, useTransition } from "react";

import {
  getNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationsPayload,
} from "@/lib/actions/notifications";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDateTime } from "@/lib/utils/dates";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function NotificationsButton({
  initialUnread = 0,
  timeZone = "UTC",
}: {
  initialUnread?: number;
  timeZone?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [payload, setPayload] = useState<NotificationsPayload | null>(null);

  function refresh() {
    startTransition(async () => {
      const next = await getNotificationsAction();
      setPayload(next);
      setUnreadCount(next.unreadCount);
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          refresh();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Notifications</p>
            <p className="text-xs text-muted-foreground">In-app alerts for this workspace.</p>
          </div>
          {payload && payload.unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await markAllNotificationsReadAction();
                  setUnreadCount(0);
                  setPayload((current) =>
                    current
                      ? {
                          ...current,
                          unreadCount: 0,
                          items: current.items.map((item) => ({ ...item, read: true })),
                        }
                      : current,
                  );
                  router.refresh();
                });
              }}
            >
              Mark all read
            </Button>
          ) : null}
        </div>

        {!payload || pending ? (
          <div className="space-y-3 px-3 py-4">
            {pending ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">Open to refresh.</p>
            )}
          </div>
        ) : !payload.enabled ? (
          <EmptyState
            compact
            title="Notifications are off"
            description="Turn in-app alerts back on in settings."
            action={
              <Link href="/settings#notifications" className="text-sm font-medium hover:underline">
                Open settings
              </Link>
            }
          />
        ) : payload.items.length === 0 ? (
          <EmptyState
            compact
            title="No notifications yet"
            description="Task, invoice, and payment alerts will show up here."
          />
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {payload.items.map((item) => {
              const body = (
                <>
                  <p className={cn("text-sm", !item.read && "font-medium")}>{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDateTime(item.createdAt, timeZone)}
                  </p>
                </>
              );

              return (
                <li key={item.id}>
                  {item.link ? (
                    <Link
                      href={item.link}
                      className={cn(
                        "block px-3 py-2.5 hover:bg-muted/60",
                        !item.read && "bg-muted/30",
                      )}
                      onClick={() => {
                        setOpen(false);
                        if (!item.read) {
                          startTransition(async () => {
                            await markNotificationReadAction(item.id);
                            setUnreadCount((count) => Math.max(0, count - 1));
                            setPayload((current) =>
                              current
                                ? {
                                    ...current,
                                    unreadCount: Math.max(0, current.unreadCount - 1),
                                    items: current.items.map((row) =>
                                      row.id === item.id ? { ...row, read: true } : row,
                                    ),
                                  }
                                : current,
                            );
                            router.refresh();
                          });
                        }
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={cn(
                        "block w-full px-3 py-2.5 text-left hover:bg-muted/60",
                        !item.read && "bg-muted/30",
                      )}
                      onClick={() => {
                        if (!item.read) {
                          startTransition(async () => {
                            await markNotificationReadAction(item.id);
                            setUnreadCount((count) => Math.max(0, count - 1));
                            setPayload((current) =>
                              current
                                ? {
                                    ...current,
                                    unreadCount: Math.max(0, current.unreadCount - 1),
                                    items: current.items.map((row) =>
                                      row.id === item.id ? { ...row, read: true } : row,
                                    ),
                                  }
                                : current,
                            );
                          });
                        }
                      }}
                    >
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
