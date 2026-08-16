"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspace } from "@/lib/auth/workspace";
import { logActivity } from "@/lib/services/activity";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/ids";
import { emptyToNull } from "@/lib/utils/text";
import { clientSchema } from "@/lib/validations/client";
import { isStaffRole } from "@/types/index";

function revalidateClients(clientId?: string) {
  revalidatePath("/");
  revalidatePath("/clients");

  if (clientId) {
    revalidatePath(`/clients/${clientId}`);
  }
}

function toClientFields(input: ReturnType<typeof clientSchema.parse>) {
  return {
    name: input.name,
    company: emptyToNull(input.company),
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    website: emptyToNull(input.website),
    address: emptyToNull(input.address),
    country: emptyToNull(input.country),
    notes: emptyToNull(input.notes),
    status: input.status,
  };
}

export async function addClientAction(input: unknown) {
  const parsed = clientSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to add clients." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({ workspace_id: workspace.id, ...toClientFields(parsed.data) })
    .select("id, name")
    .single();

  if (error || !data) {
    return { error: "Could not add this client. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "client",
    entityId: data.id,
    action: "created",
    message: `added ${data.name} as a client.`,
  });

  revalidateClients(data.id);
  redirect(`/clients/${data.id}`);
}

export async function updateClientAction(clientId: string, input: unknown) {
  if (!isUuid(clientId)) {
    return { error: "Client not found." };
  }

  const parsed = clientSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to edit clients." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update(toClientFields(parsed.data))
    .eq("id", clientId)
    .eq("workspace_id", workspace.id)
    .select("id, name")
    .maybeSingle();

  if (error || !data) {
    return { error: "Could not save this client. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "client",
    entityId: data.id,
    action: "updated",
    message: `updated ${data.name}.`,
  });

  revalidateClients(data.id);
  return { error: null };
}

export async function archiveClientAction(clientId: string) {
  return setClientStatusAction(clientId, "archived", "archived");
}

export async function restoreClientAction(clientId: string) {
  return setClientStatusAction(clientId, "active", "restored");
}

async function setClientStatusAction(
  clientId: string,
  status: "active" | "archived" | "inactive",
  action: string,
) {
  if (!isUuid(clientId)) {
    return { error: "Client not found." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to update clients." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ status })
    .eq("id", clientId)
    .eq("workspace_id", workspace.id)
    .select("id, name")
    .maybeSingle();

  if (error || !data) {
    return { error: "Could not update this client. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "client",
    entityId: data.id,
    action,
    message: `${action} ${data.name}.`,
  });

  revalidateClients(data.id);
  return { error: null };
}

export async function deleteClientAction(clientId: string) {
  if (!isUuid(clientId)) {
    return { error: "Client not found." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to delete clients." };
  }

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!client) {
    return { error: "Client not found." };
  }

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not delete this client. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "client",
    entityId: client.id,
    action: "deleted",
    message: `deleted ${client.name}.`,
  });

  revalidateClients();
  redirect("/clients");
}
