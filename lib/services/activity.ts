import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ACTIVITY_PAGE_SIZE, activityHref, type ActivityListParams } from "@/lib/activity/params";
import { createClient } from "@/lib/supabase/server";
import { throwUserError } from "@/lib/logging/safe-error";
import { sanitizeSearch } from "@/lib/utils/text";
import type { Database, Json } from "@/types/database";

export type ActivityItem = {
  id: string;
  message: string;
  createdAt: string;
  entityType: string;
  entityId: string;
  action: string;
  href: string | null;
};

export type ActivityPageData = {
  items: ActivityItem[];
  total: number;
  page: number;
  pageCount: number;
};

function actorFirstName(fullName: string | null | undefined) {
  const token = fullName?.trim().split(/\s+/)[0];
  return token || "Someone";
}

export function activityMessage(metadata: Json, entityType: string, action: string) {
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    typeof metadata.message === "string"
  ) {
    return metadata.message;
  }

  return `${entityType} ${action}`;
}

export function mapActivityRow(item: {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  metadata: Json;
  created_at: string;
}): ActivityItem {
  return {
    id: item.id,
    entityType: item.entity_type,
    entityId: item.entity_id,
    action: item.action,
    createdAt: item.created_at,
    message: activityMessage(item.metadata, item.entity_type, item.action),
    href: activityHref(item.entity_type, item.entity_id),
  };
}

export async function logActivity(
  supabase: SupabaseClient<Database>,
  input: {
    workspaceId: string;
    userId: string;
    entityType: string;
    entityId: string;
    action: string;
    message: string;
  },
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", input.userId)
    .maybeSingle();

  const message = `${actorFirstName(profile?.full_name)} ${input.message.trim()}`;
  const { error } = await supabase.from("activity_logs").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    metadata: { message },
  });

  if (!error) {
    revalidatePath("/activity");
  }

  return error;
}

export async function logInvoicePaidIfNeeded(
  supabase: SupabaseClient<Database>,
  input: {
    workspaceId: string;
    userId: string;
    invoiceId: string;
    invoiceNumber: string;
    previousStatus: string;
    nextStatus: string;
  },
) {
  if (input.nextStatus !== "paid" || input.previousStatus === "paid") {
    return;
  }

  await logActivity(supabase, {
    workspaceId: input.workspaceId,
    userId: input.userId,
    entityType: "invoice",
    entityId: input.invoiceId,
    action: "paid",
    message: `marked invoice ${input.invoiceNumber} as paid.`,
  });
}

export async function getActivityPageData(
  workspaceId: string,
  params: ActivityListParams,
): Promise<ActivityPageData> {
  const supabase = await createClient();
  const search = sanitizeSearch(params.q);
  const from = (params.page - 1) * ACTIVITY_PAGE_SIZE;
  const to = from + ACTIVITY_PAGE_SIZE - 1;

  let query = supabase
    .from("activity_logs")
    .select("id, entity_type, entity_id, action, metadata, created_at", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.entityType !== "all") {
    query = query.eq("entity_type", params.entityType);
  }

  if (search) {
    query = query.filter("metadata->>message", "ilike", `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throwUserError("activity.list", error, "Could not load activity.");
  }

  const total = count ?? 0;

  return {
    items: (data ?? []).map(mapActivityRow),
    total,
    page: params.page,
    pageCount: Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE)),
  };
}
