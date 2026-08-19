"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/workspace";
import { isDemoDataEnabled } from "@/lib/demo/constants";
import { clearDemoData, seedDemoData, workspaceHasDemoData } from "@/lib/services/demo";
import { createClient } from "@/lib/supabase/server";
import { canManageWorkspace } from "@/types/index";

function revalidateDemoPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/bugs");
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/time");
  revalidatePath("/notes");
  revalidatePath("/reports");
  revalidatePath("/activity");
  revalidatePath("/settings");
}

function denyIfUnavailable() {
  if (!isDemoDataEnabled()) {
    return { error: "Demo data tools are disabled in this environment." };
  }

  return null;
}

export async function seedDemoDataAction() {
  const denied = denyIfUnavailable();
  if (denied) {
    return denied;
  }

  const { workspace, user } = await requireStaff();

  if (!canManageWorkspace(workspace.role)) {
    return { error: "Only workspace owners and admins can seed demo data." };
  }

  const supabase = await createClient();
  const result = await seedDemoData(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    currency: workspace.currency,
    timeZone: workspace.timezone,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  revalidateDemoPaths();
  return { ok: true as const, summary: result };
}

export async function clearDemoDataAction() {
  const denied = denyIfUnavailable();
  if (denied) {
    return denied;
  }

  const { workspace } = await requireStaff();

  if (!canManageWorkspace(workspace.role)) {
    return { error: "Only workspace owners and admins can clear demo data." };
  }

  const supabase = await createClient();

  if (!(await workspaceHasDemoData(supabase, workspace.id))) {
    return { error: "No demo data found in this workspace." };
  }

  const result = await clearDemoData(supabase, workspace.id);

  if ("error" in result) {
    return { error: result.error };
  }

  revalidateDemoPaths();
  return { ok: true as const };
}
