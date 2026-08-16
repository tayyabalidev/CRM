import { PROJECT_BOARD_LIMIT, PROJECT_PAGE_SIZE, type ProjectListParams } from "@/lib/projects/params";
import { mapActivityRow, type ActivityItem } from "@/lib/services/activity";
import { createClient } from "@/lib/supabase/server";
import { entrySeconds } from "@/lib/services/time";
import { formatDuration } from "@/lib/utils/duration";
import { toNumber } from "@/lib/utils/money";
import { projectProgress } from "@/lib/utils/progress";
import { sanitizeSearch } from "@/lib/utils/text";
import { OPTION_LIST_LIMIT, ensureIncludedOption } from "@/lib/utils/options";
import type { InvoiceStatus, NoteVisibility, Priority, ProjectStatus, TaskStatus, WorkspaceRole } from "@/types/index";
import type { Tables } from "@/types/database";

export type ProjectRecord = Tables<"projects">;

export type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: Priority;
  budget: number | null;
  currency: string;
  startDate: string | null;
  dueDate: string | null;
  clientId: string;
  clientName: string;
  progress: number;
  progressSource: "auto" | "manual";
  taskTotal: number;
  taskCompleted: number;
};

export type ProjectListResult = {
  projects: ProjectListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ProjectTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
};

export type ProjectTimeEntry = {
  id: string;
  description: string | null;
  startedAt: string;
  endedAt: string | null;
  durationLabel: string;
  billable: boolean;
};

export type ProjectPayment = {
  id: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method: string;
};

export type ProjectInvoice = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  total: number;
  dueDate: string | null;
};

export type ProjectFile = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  createdAt: string;
};

export type ProjectNote = {
  id: string;
  title: string;
  content: string | null;
  visibility: NoteVisibility;
  createdAt: string;
  createdBy: string | null;
  clientId: string | null;
};

export type ProjectActivity = ActivityItem;

export type ProjectMember = {
  id: string;
  name: string;
  role: WorkspaceRole;
  avatarUrl: string | null;
  assigned: boolean;
};

export type ProjectDetail = {
  project: ProjectRecord;
  clientName: string;
  progress: number;
  progressSource: "auto" | "manual";
  taskTotal: number;
  taskCompleted: number;
  paid: number;
  remaining: number | null;
  trackedSeconds: number;
  team: ProjectMember[];
  tasks: ProjectTask[];
  timeEntries: ProjectTimeEntry[];
  payments: ProjectPayment[];
  invoices: ProjectInvoice[];
  files: ProjectFile[];
  notes: ProjectNote[];
  activity: ProjectActivity[];
};

function relatedName(value: { name: string } | { name: string }[] | null | undefined) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0]?.name ?? null) : value.name;
}

function relatedProfile(
  value:
    | { id: string; full_name: string | null; avatar_url: string | null }
    | { id: string; full_name: string | null; avatar_url: string | null }[]
    | null
    | undefined,
) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function taskStats(tasks: { project_id: string | null; status: TaskStatus }[], projectId: string) {
  const forProject = tasks.filter((task) => task.project_id === projectId);
  const completed = forProject.filter((task) => task.status === "completed").length;
  return { total: forProject.length, completed };
}

export async function listProjects(
  workspaceId: string,
  params: ProjectListParams,
): Promise<ProjectListResult> {
  const supabase = await createClient();
  const search = sanitizeSearch(params.q);
  const paged = params.view !== "board";
  const from = (params.page - 1) * PROJECT_PAGE_SIZE;
  const to = from + PROJECT_PAGE_SIZE - 1;

  let query = supabase
    .from("projects")
    .select("id, name, description, status, priority, budget, currency, start_date, due_date, progress, client_id, clients ( name )", {
      count: "exact",
    })
    .eq("workspace_id", workspaceId)
    .order(params.sort, { ascending: params.dir === "asc", nullsFirst: false });

  if (params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.priority !== "all") {
    query = query.eq("priority", params.priority);
  }

  if (params.clientId) {
    query = query.eq("client_id", params.clientId);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  query = paged ? query.range(from, to) : query.limit(PROJECT_BOARD_LIMIT);

  const { data, count, error } = await query;

  if (error) {
    throw new Error("Could not load projects.");
  }

  const rows = data ?? [];
  const ids = rows.map((project) => project.id);
  const { data: tasks } = ids.length
    ? await supabase.from("tasks").select("project_id, status").eq("workspace_id", workspaceId).in("project_id", ids)
    : { data: [] };

  const total = count ?? 0;

  return {
    projects: rows.map((project) => {
      const stats = taskStats((tasks ?? []) as { project_id: string | null; status: TaskStatus }[], project.id);
      const progress = projectProgress(project.progress, stats.completed, stats.total);

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority,
        budget: project.budget == null ? null : toNumber(project.budget),
        currency: project.currency,
        startDate: project.start_date,
        dueDate: project.due_date,
        clientId: project.client_id,
        clientName: relatedName(project.clients) ?? "Unknown client",
        progress: progress.value,
        progressSource: progress.source,
        taskTotal: stats.total,
        taskCompleted: stats.completed,
      };
    }),
    total,
    page: params.page,
    pageSize: PROJECT_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PROJECT_PAGE_SIZE)),
  };
}

export async function getProjectDetail(workspaceId: string, projectId: string): Promise<ProjectDetail | null> {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, clients ( name )")
    .eq("workspace_id", workspaceId)
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return null;
  }

  const [
    tasksResult,
    timeResult,
    paymentsResult,
    invoicesResult,
    filesResult,
    notesResult,
    activityResult,
    paymentTotals,
    membersResult,
    taskTotalResult,
    taskCompletedResult,
    assigneesResult,
    allTimeResult,
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, assigned_to")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20),
    supabase
      .from("time_entries")
      .select("id, description, started_at, ended_at, duration_seconds, billable")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("started_at", { ascending: false })
      .limit(12),
    supabase
      .from("payments")
      .select("id, amount, currency, payment_date, payment_method")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("payment_date", { ascending: false })
      .limit(8),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, total, due_date")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("issue_date", { ascending: false })
      .limit(8),
    supabase
      .from("files")
      .select("id, file_name, file_size, mime_type, created_at")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("notes")
      .select("id, title, content, visibility, created_at, created_by, client_id")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("activity_logs")
      .select("id, action, entity_type, entity_id, metadata, created_at")
      .eq("workspace_id", workspaceId)
      .eq("entity_type", "project")
      .eq("entity_id", projectId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("payments")
      .select("amount")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId),
    supabase
      .from("workspace_members")
      .select("role, user_id, profiles ( id, full_name, avatar_url )")
      .eq("workspace_id", workspaceId)
      .in("role", ["owner", "admin", "member"]),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .eq("status", "completed"),
    supabase
      .from("tasks")
      .select("assigned_to")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .not("assigned_to", "is", null),
    supabase
      .from("time_entries")
      .select("duration_seconds, started_at, ended_at")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId),
  ]);

  const tasks = tasksResult.data ?? [];
  const taskTotal = taskTotalResult.count ?? 0;
  const taskCompleted = taskCompletedResult.count ?? 0;
  const paid = (paymentTotals.data ?? []).reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const budget = project.budget == null ? null : toNumber(project.budget);
  const remaining = budget == null ? null : Math.max(budget - paid, 0);
  const progress = projectProgress(project.progress, taskCompleted, taskTotal);
  const assignedIds = new Set(
    (assigneesResult.data ?? []).map((task) => task.assigned_to).filter((id): id is string => Boolean(id)),
  );

  const trackedSeconds = (allTimeResult.data ?? []).reduce((sum, entry) => sum + entrySeconds(entry), 0);

  const team: ProjectMember[] = (membersResult.data ?? []).flatMap((member) => {
    const profile = relatedProfile(member.profiles);

    if (!profile) {
      return [];
    }

    return [
      {
        id: profile.id,
        name: profile.full_name || "Workspace member",
        role: member.role,
        avatarUrl: profile.avatar_url,
        assigned: assignedIds.has(profile.id),
      },
    ];
  });

  const { clients, ...projectRow } = project;

  return {
    project: projectRow,
    clientName: relatedName(clients) ?? "Unknown client",
    progress: progress.value,
    progressSource: progress.source,
    taskTotal,
    taskCompleted,
    paid,
    remaining,
    trackedSeconds,
    team,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date,
    })),
    timeEntries: (timeResult.data ?? []).map((entry) => ({
      id: entry.id,
      description: entry.description,
      startedAt: entry.started_at,
      endedAt: entry.ended_at,
      durationLabel: entry.ended_at
        ? formatDuration(
            entry.duration_seconds ??
              Math.max(0, Math.round((Date.parse(entry.ended_at) - Date.parse(entry.started_at)) / 1000)),
          )
        : "Running",
      billable: entry.billable,
    })),
    payments: (paymentsResult.data ?? []).map((payment) => ({
      id: payment.id,
      amount: toNumber(payment.amount),
      currency: payment.currency,
      paymentDate: payment.payment_date,
      method: payment.payment_method,
    })),
    invoices: (invoicesResult.data ?? []).map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      status: invoice.status,
      total: toNumber(invoice.total),
      dueDate: invoice.due_date,
    })),
    files: (filesResult.data ?? []).map((file) => ({
      id: file.id,
      fileName: file.file_name,
      fileSize: Number(file.file_size),
      mimeType: file.mime_type,
      createdAt: file.created_at,
    })),
    notes: (notesResult.data ?? []).map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      visibility: note.visibility,
      createdAt: note.created_at,
      createdBy: note.created_by,
      clientId: note.client_id,
    })),
    activity: (activityResult.data ?? []).map(mapActivityRow),
  };
}

export async function listProjectOptions(workspaceId: string, includeId?: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, status, client_id")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true })
    .limit(OPTION_LIST_LIMIT);

  const rows = (data ?? []).filter(
    (project) =>
      (project.status !== "completed" && project.status !== "cancelled") || project.id === includeId,
  );

  return ensureIncludedOption(rows, includeId, async (id) => {
    const { data: row } = await supabase
      .from("projects")
      .select("id, name, status, client_id")
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .maybeSingle();

    return row;
  });
}
