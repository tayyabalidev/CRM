import { TASK_BOARD_LIMIT, TASK_PAGE_SIZE, type TaskListParams } from "@/lib/tasks/params";
import { mapActivityRow, type ActivityItem } from "@/lib/services/activity";
import { createClient } from "@/lib/supabase/server";
import { entrySeconds } from "@/lib/services/time";
import { addCalendarDays, zonedDateKey } from "@/lib/utils/dates";
import { sanitizeSearch } from "@/lib/utils/text";
import { OPTION_LIST_LIMIT, ensureIncludedOption } from "@/lib/utils/options";
import type { Priority, TaskStatus } from "@/types/index";
import type { Tables } from "@/types/database";

export type TaskRecord = Tables<"tasks">;

export type AssigneeOption = {
  id: string;
  name: string;
};

export type TaskListItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  projectId: string | null;
  projectName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  estimatedMinutes: number | null;
};

export type TaskListResult = {
  tasks: TaskListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type TaskComment = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  authorName: string;
  authorAvatar: string | null;
};

export type TaskFile = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  createdAt: string;
};

export type TaskActivity = ActivityItem;

export type TaskDetail = {
  task: TaskRecord;
  projectName: string | null;
  clientName: string | null;
  assigneeName: string | null;
  trackedSeconds: number;
  comments: TaskComment[];
  files: TaskFile[];
  activity: TaskActivity[];
};

function relatedName(value: { name: string } | { name: string }[] | null | undefined) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0]?.name ?? null) : value.name;
}

function relatedProfile(
  value:
    | { id?: string; full_name: string | null; avatar_url?: string | null }
    | { id?: string; full_name: string | null; avatar_url?: string | null }[]
    | null
    | undefined,
) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listAssigneeOptions(workspaceId: string): Promise<AssigneeOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("user_id, role, profiles ( id, full_name )")
    .eq("workspace_id", workspaceId)
    .in("role", ["owner", "admin", "member"]);

  return (data ?? []).flatMap((member) => {
    const profile = relatedProfile(member.profiles);
    const id = profile?.id ?? member.user_id;

    if (!id) {
      return [];
    }

    return [{ id, name: profile?.full_name || "Workspace member" }];
  });
}

export async function listTasks(
  workspaceId: string,
  params: TaskListParams,
  timeZone: string,
): Promise<TaskListResult> {
  const supabase = await createClient();
  const search = sanitizeSearch(params.q);
  const paged = params.view !== "board";
  const from = (params.page - 1) * TASK_PAGE_SIZE;
  const to = from + TASK_PAGE_SIZE - 1;
  const now = new Date();
  const todayKey = zonedDateKey(now, timeZone);
  const tomorrowKey = addCalendarDays(todayKey, 1);

  let query = supabase
    .from("tasks")
    .select(
      "id, title, description, status, priority, due_date, project_id, assigned_to, estimated_minutes, projects ( name ), profiles ( full_name )",
      { count: "exact" },
    )
    .eq("workspace_id", workspaceId)
    .order(params.sort, { ascending: params.dir === "asc", nullsFirst: false });

  if (params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.priority !== "all") {
    query = query.eq("priority", params.priority);
  }

  if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  }

  if (params.assigneeId === "unassigned") {
    query = query.is("assigned_to", null);
  } else if (params.assigneeId) {
    query = query.eq("assigned_to", params.assigneeId);
  }

  if (params.due === "overdue") {
    query = query.not("due_date", "is", null).lt("due_date", `${todayKey}T00:00:00.000Z`).neq("status", "completed");
  } else if (params.due === "today") {
    query = query.gte("due_date", `${todayKey}T00:00:00.000Z`).lt("due_date", `${tomorrowKey}T00:00:00.000Z`);
  } else if (params.due === "upcoming") {
    query = query.gte("due_date", `${tomorrowKey}T00:00:00.000Z`);
  } else if (params.due === "none") {
    query = query.is("due_date", null);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  query = paged ? query.range(from, to) : query.limit(TASK_BOARD_LIMIT);

  const { data, count, error } = await query;

  if (error) {
    throw new Error("Could not load tasks.");
  }

  const total = count ?? 0;

  return {
    tasks: (data ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date,
      projectId: task.project_id,
      projectName: relatedName(task.projects),
      assigneeId: task.assigned_to,
      assigneeName: relatedProfile(task.profiles)?.full_name ?? null,
      estimatedMinutes: task.estimated_minutes,
    })),
    total,
    page: params.page,
    pageSize: TASK_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / TASK_PAGE_SIZE)),
  };
}

export async function getTaskDetail(workspaceId: string, taskId: string): Promise<TaskDetail | null> {
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("*, projects ( name, clients ( name ) ), profiles ( full_name )")
    .eq("workspace_id", workspaceId)
    .eq("id", taskId)
    .maybeSingle();

  if (!task) {
    return null;
  }

  const [commentsResult, filesResult, activityResult, timeResult] = await Promise.all([
    supabase
      .from("task_comments")
      .select("id, content, created_at, user_id, profiles ( full_name, avatar_url )")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true }),
    supabase
      .from("files")
      .select("id, file_name, file_size, mime_type, created_at")
      .eq("workspace_id", workspaceId)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("activity_logs")
      .select("id, action, entity_type, entity_id, metadata, created_at")
      .eq("workspace_id", workspaceId)
      .eq("entity_type", "task")
      .eq("entity_id", taskId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("time_entries")
      .select("duration_seconds, started_at, ended_at")
      .eq("workspace_id", workspaceId)
      .eq("task_id", taskId),
  ]);

  const trackedSeconds = (timeResult.data ?? []).reduce((sum, entry) => sum + entrySeconds(entry), 0);

  const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
  const client = project?.clients
    ? Array.isArray(project.clients)
      ? project.clients[0]
      : project.clients
    : null;

  return {
    task: {
      id: task.id,
      workspace_id: task.workspace_id,
      project_id: task.project_id,
      client_id: task.client_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to,
      due_date: task.due_date,
      estimated_minutes: task.estimated_minutes,
      completed_at: task.completed_at,
      created_at: task.created_at,
      updated_at: task.updated_at,
    },
    projectName: project?.name ?? null,
    clientName: client?.name ?? null,
    assigneeName: relatedProfile(task.profiles)?.full_name ?? null,
    trackedSeconds,
    comments: (commentsResult.data ?? []).map((comment) => {
      const author = relatedProfile(comment.profiles);
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        userId: comment.user_id,
        authorName: author?.full_name || "Teammate",
        authorAvatar: author?.avatar_url ?? null,
      };
    }),
    files: (filesResult.data ?? []).map((file) => ({
      id: file.id,
      fileName: file.file_name,
      fileSize: Number(file.file_size),
      mimeType: file.mime_type,
      createdAt: file.created_at,
    })),
    activity: (activityResult.data ?? []).map(mapActivityRow),
  };
}

export async function listTaskOptions(workspaceId: string, projectId: string, includeId?: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, status, project_id")
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .order("title", { ascending: true })
    .limit(OPTION_LIST_LIMIT);

  const rows = (data ?? []).filter((task) => task.status !== "completed" || task.id === includeId);

  return ensureIncludedOption(rows, includeId, async (id) => {
    const { data: row } = await supabase
      .from("tasks")
      .select("id, title, status, project_id")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .eq("id", id)
      .maybeSingle();

    return row;
  });
}
