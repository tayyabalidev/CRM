"use client";

import Link from "next/link";
import { Clock3, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { DeleteTimeEntryDialog } from "@/components/time/delete-time-entry-dialog";
import { TimeEntryFormSheet, type TimeEntryFormValues } from "@/components/time/time-entry-form-sheet";
import { useTimer } from "@/components/time/timer-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TimeEntryListItem } from "@/lib/services/time";
import { formatDate, formatTime } from "@/lib/utils/dates";
import { formatDuration, formatTimer } from "@/lib/utils/duration";
import { formatMoney } from "@/lib/utils/money";

function toFormEntry(entry: TimeEntryListItem): TimeEntryFormValues & { id: string } {
  return {
    id: entry.id,
    projectId: entry.projectId,
    taskId: entry.taskId,
    description: entry.description,
    startedAt: entry.startedAt,
    endedAt: entry.endedAt,
    billable: entry.billable,
    hourlyRate: entry.hourlyRate,
  };
}

export function TimeEntryList({
  entries,
  timeZone,
  currency,
  canManage,
  projects,
  emptyAction,
  hasFilters,
}: {
  entries: TimeEntryListItem[];
  timeZone: string;
  currency: string;
  canManage: boolean;
  projects: { id: string; name: string }[];
  emptyAction?: ReactNode;
  hasFilters: boolean;
}) {
  const { running, elapsed } = useTimer();

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<Clock3 className="size-4" />}
            title={hasFilters ? "No matching time entries" : "No time tracked yet"}
            description={
              hasFilters
                ? "Try a different search or filter."
                : "Start the timer in the header or add a manual entry."
            }
            action={hasFilters ? undefined : emptyAction}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {entries.map((entry) => {
          const isRunning = entry.running && running?.id === entry.id;
          const seconds = isRunning ? elapsed : entry.durationSeconds;

          return (
            <Card key={entry.id} size="sm">
              <CardContent className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/projects/${entry.projectId}`} className="truncate font-medium hover:underline">
                      {entry.projectName}
                    </Link>
                    {entry.running ? <Badge variant="destructive">Running</Badge> : null}
                    {entry.billable ? (
                      <Badge variant="secondary">Billable</Badge>
                    ) : (
                      <Badge variant="outline">Non-billable</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.taskId ? (
                      <Link href={`/tasks/${entry.taskId}`} className="hover:underline">
                        {entry.taskTitle ?? "Task"}
                      </Link>
                    ) : (
                      "No task"
                    )}
                    {entry.description ? ` · ${entry.description}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(entry.startedAt, timeZone)} {formatTime(entry.startedAt, timeZone)}
                    {entry.endedAt ? ` – ${formatTime(entry.endedAt, timeZone)}` : ""}
                  </p>
                  <p className="font-mono text-sm tabular-nums">
                    {entry.running ? formatTimer(seconds) : formatDuration(seconds)}
                    {entry.hourlyRate != null ? (
                      <span className="ml-2 font-sans text-xs text-muted-foreground">
                        {formatMoney(entry.hourlyRate, currency)}/hr
                      </span>
                    ) : null}
                  </p>
                </div>
                {canManage && !entry.running ? (
                  <TimeEntryRowActions entry={toFormEntry(entry)} projects={projects} />
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-xl border md:block">
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto_auto] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
          <p>Work</p>
          <p>When</p>
          <p>Duration</p>
          <p>Rate</p>
          <p className="text-right">Actions</p>
        </div>
        {entries.map((entry) => {
          const isRunning = entry.running && running?.id === entry.id;
          const seconds = isRunning ? elapsed : entry.durationSeconds;

          return (
            <div
              key={entry.id}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/projects/${entry.projectId}`} className="truncate font-medium hover:underline">
                    {entry.projectName}
                  </Link>
                  {entry.running ? <Badge variant="destructive">Running</Badge> : null}
                  {entry.billable ? (
                    <Badge variant="secondary">Billable</Badge>
                  ) : (
                    <Badge variant="outline">Non-billable</Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {entry.taskId ? (
                    <Link href={`/tasks/${entry.taskId}`} className="hover:underline">
                      {entry.taskTitle ?? "Task"}
                    </Link>
                  ) : (
                    "No task"
                  )}
                  {entry.description ? ` · ${entry.description}` : ""}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(entry.startedAt, timeZone)} {formatTime(entry.startedAt, timeZone)}
                {entry.endedAt ? ` – ${formatTime(entry.endedAt, timeZone)}` : ""}
              </p>
              <p className="font-mono text-sm tabular-nums">
                {entry.running ? formatTimer(seconds) : formatDuration(seconds)}
              </p>
              <p className="text-xs text-muted-foreground">
                {entry.hourlyRate == null ? "—" : formatMoney(entry.hourlyRate, currency)}
              </p>
              <div className="flex justify-end">
                {canManage && !entry.running ? (
                  <TimeEntryRowActions entry={toFormEntry(entry)} projects={projects} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TimeEntryRowActions({
  entry,
  projects,
}: {
  entry: TimeEntryFormValues & { id: string };
  projects: { id: string; name: string }[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Time entry actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TimeEntryFormSheet
        entry={entry}
        projects={projects}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteTimeEntryDialog entryId={entry.id} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
