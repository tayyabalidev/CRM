import { TIME_PAGE_SIZE, type TimeListParams } from "@/lib/time/params";
import { createClient } from "@/lib/supabase/server";
import { throwUserError } from "@/lib/logging/safe-error";
import { startOfWeekKey, zonedDateKey } from "@/lib/utils/dates";
import { sanitizeSearch } from "@/lib/utils/text";
import { toNumber } from "@/lib/utils/money";

export type RunningTimer = {
  id: string;
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskTitle: string | null;
  description: string | null;
  startedAt: string;
  billable: boolean;
  hourlyRate: number | null;
};

export type TimeEntryListItem = {
  id: string;
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskTitle: string | null;
  description: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  billable: boolean;
  hourlyRate: number | null;
  running: boolean;
};

export type ProjectTimeTotal = {
  projectId: string;
  projectName: string;
  seconds: number;
};

export type TimeSummary = {
  todaySeconds: number;
  weekSeconds: number;
  weekBillableSeconds: number;
  weekNonBillableSeconds: number;
  projectTotals: ProjectTimeTotal[];
};

export type TimePageData = {
  summary: TimeSummary;
  entries: TimeEntryListItem[];
  total: number;
  page: number;
  pageCount: number;
  running: RunningTimer | null;
};

function relatedName(value: { name: string } | { name: string }[] | null | undefined) {
  if (!value) {
    return null;
  }

  const row = Array.isArray(value) ? value[0] : value;
  return row?.name ?? null;
}

function relatedTitle(value: { title: string } | { title: string }[] | null | undefined) {
  if (!value) {
    return null;
  }

  const row = Array.isArray(value) ? value[0] : value;
  return row?.title ?? null;
}

export function entrySeconds(
  entry: { duration_seconds: number | null; started_at: string; ended_at: string | null },
  now = Date.now(),
) {
  if (entry.duration_seconds != null) {
    return entry.duration_seconds;
  }

  if (entry.ended_at) {
    return Math.max(0, Math.round((Date.parse(entry.ended_at) - Date.parse(entry.started_at)) / 1000));
  }

  return Math.max(0, Math.round((now - Date.parse(entry.started_at)) / 1000));
}

function mapRunning(
  row: {
    id: string;
    project_id: string;
    task_id: string | null;
    description: string | null;
    started_at: string;
    billable: boolean;
    hourly_rate: string | null;
    projects: { name: string } | { name: string }[] | null;
    tasks: { title: string } | { title: string }[] | null;
  } | null,
): RunningTimer | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    projectId: row.project_id,
    projectName: relatedName(row.projects) ?? "Project",
    taskId: row.task_id,
    taskTitle: relatedTitle(row.tasks),
    description: row.description,
    startedAt: row.started_at,
    billable: row.billable,
    hourlyRate: row.hourly_rate == null ? null : toNumber(row.hourly_rate),
  };
}

export async function getRunningTimer(workspaceId: string, userId: string): Promise<RunningTimer | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("time_entries")
    .select("id, project_id, task_id, description, started_at, billable, hourly_rate, projects ( name ), tasks ( title )")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1);

  return mapRunning(data?.[0] ?? null);
}

export async function getTimePageData(
  workspaceId: string,
  userId: string,
  timeZone: string,
  params: TimeListParams,
): Promise<TimePageData> {
  const supabase = await createClient();
  const now = Date.now();
  const todayKey = zonedDateKey(new Date(now), timeZone);
  const weekStart = startOfWeekKey(timeZone, new Date(now));
  const search = sanitizeSearch(params.q);
  const from = (params.page - 1) * TIME_PAGE_SIZE;
  const to = from + TIME_PAGE_SIZE - 1;

  const [allResult, listResult, running] = await Promise.all([
    supabase
      .from("time_entries")
      .select("project_id, duration_seconds, started_at, ended_at, billable, projects ( name )")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .gte("started_at", `${weekStart}T00:00:00.000Z`),
    (() => {
      let query = supabase
        .from("time_entries")
        .select(
          "id, project_id, task_id, description, started_at, ended_at, duration_seconds, billable, hourly_rate, projects ( name ), tasks ( title )",
          { count: "exact" },
        )
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .range(from, to);

      if (params.projectId) {
        query = query.eq("project_id", params.projectId);
      }

      if (params.billable === "yes") {
        query = query.eq("billable", true);
      } else if (params.billable === "no") {
        query = query.eq("billable", false);
      }

      if (search) {
        query = query.ilike("description", `%${search}%`);
      }

      return query;
    })(),
    getRunningTimer(workspaceId, userId),
  ]);

  if (listResult.error) {
    throwUserError("time.list", listResult.error, "Could not load time entries.");
  }

  const projectTotals = new Map<string, ProjectTimeTotal>();
  let todaySeconds = 0;
  let weekSeconds = 0;
  let weekBillableSeconds = 0;
  let weekNonBillableSeconds = 0;

  for (const entry of allResult.data ?? []) {
    if (!entry.ended_at) {
      continue;
    }

    const seconds = entrySeconds(entry, now);
    const startedKey = zonedDateKey(entry.started_at, timeZone);
    weekSeconds += seconds;

    if (entry.billable) {
      weekBillableSeconds += seconds;
    } else {
      weekNonBillableSeconds += seconds;
    }

    if (startedKey === todayKey) {
      todaySeconds += seconds;
    }

    const projectId = entry.project_id;
    const current = projectTotals.get(projectId) ?? {
      projectId,
      projectName: relatedName(entry.projects) ?? "Project",
      seconds: 0,
    };
    current.seconds += seconds;
    projectTotals.set(projectId, current);
  }

  const total = listResult.count ?? 0;

  return {
    summary: {
      todaySeconds,
      weekSeconds,
      weekBillableSeconds,
      weekNonBillableSeconds,
      projectTotals: [...projectTotals.values()].sort((a, b) => b.seconds - a.seconds),
    },
    entries: (listResult.data ?? []).map((entry) => ({
      id: entry.id,
      projectId: entry.project_id,
      projectName: relatedName(entry.projects) ?? "Project",
      taskId: entry.task_id,
      taskTitle: relatedTitle(entry.tasks),
      description: entry.description,
      startedAt: entry.started_at,
      endedAt: entry.ended_at,
      durationSeconds: entrySeconds(entry, now),
      billable: entry.billable,
      hourlyRate: entry.hourly_rate == null ? null : toNumber(entry.hourly_rate),
      running: entry.ended_at == null,
    })),
    total,
    page: params.page,
    pageCount: Math.max(1, Math.ceil(total / TIME_PAGE_SIZE)),
    running,
  };
}
