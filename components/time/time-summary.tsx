"use client";

import { Clock3, FolderKanban, Timer } from "lucide-react";

import { useTimer } from "@/components/time/timer-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimeSummary as TimeSummaryData } from "@/lib/services/time";
import { formatDuration } from "@/lib/utils/duration";

export function TimeSummary({ summary }: { summary: TimeSummaryData }) {
  const { running, elapsed } = useTimer();
  const extra = running ? elapsed : 0;
  const today = summary.todaySeconds + extra;
  const week = summary.weekSeconds + extra;
  const billable = summary.weekBillableSeconds + (running?.billable ? extra : 0);
  const projectTotals = running
    ? mergeRunningProject(summary.projectTotals, running.projectId, running.projectName, extra)
    : summary.projectTotals;

  const items = [
    {
      title: "Today",
      value: formatDuration(today),
      hint: running ? "Includes the running timer" : "Time started today",
      icon: Timer,
    },
    {
      title: "This week",
      value: formatDuration(week),
      hint: "Monday to now",
      icon: Clock3,
    },
    {
      title: "Billable",
      value: formatDuration(billable),
      hint: "Billable time this week",
      icon: Clock3,
    },
    {
      title: "Project time",
      value: formatDuration(projectTotals[0]?.seconds ?? 0),
      hint: projectTotals[0] ? projectTotals[0].projectName : "No project time this week",
      icon: FolderKanban,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title} size="sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tracking-tight">{item.value}</CardTitle>
            </div>
            <span className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <item.icon className="size-4 text-muted-foreground" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
      {projectTotals.length > 0 ? (
        <Card className="sm:col-span-2 xl:col-span-4" size="sm">
          <CardHeader>
            <CardTitle>This week by project</CardTitle>
            <CardDescription>Completed entries plus the running timer.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {projectTotals.map((project) => (
              <div key={project.projectId} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <p className="truncate text-sm">{project.projectName}</p>
                <p className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {formatDuration(project.seconds)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function mergeRunningProject(
  totals: TimeSummaryData["projectTotals"],
  projectId: string,
  projectName: string,
  extra: number,
) {
  const next = totals.map((item) =>
    item.projectId === projectId ? { ...item, seconds: item.seconds + extra } : item,
  );

  if (!next.some((item) => item.projectId === projectId)) {
    next.push({ projectId, projectName, seconds: extra });
  }

  return next.sort((a, b) => b.seconds - a.seconds);
}
