"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthState } from "@/lib/auth/session";
import { requireWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/ids";
import { isStaffRole } from "@/types/index";

const INVITE_DAYS = 14;

type RpcResult = {
  ok?: boolean;
  error?: string;
  workspaceName?: string;
  clientName?: string;
};

function readRpc(data: unknown): RpcResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  return data as RpcResult;
}

type InvitePreview =
  | { workspaceName: string; clientName: string }
  | { error: "invalid" | "used" | "expired" };

export async function createPortalInviteAction(clientId: string): Promise<{ token: string } | { error: string }> {
  if (!isUuid(clientId)) {
    return { error: "Client not found." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to invite portal users." };
  }

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!client) {
    return { error: "Client not found." };
  }

  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("portal_invites")
    .insert({
      workspace_id: workspace.id,
      client_id: clientId,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select("token")
    .single();

  if (error || !data) {
    return { error: "Could not create this invite. Try again." };
  }

  revalidatePath(`/clients/${clientId}`);
  return { token: data.token };
}

export async function revokePortalInviteAction(inviteId: string, clientId: string) {
  if (!isUuid(inviteId) || !isUuid(clientId)) {
    return { error: "Invite not found." };
  }

  const { workspace } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to revoke invites." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("portal_invites")
    .delete()
    .eq("id", inviteId)
    .eq("workspace_id", workspace.id)
    .eq("client_id", clientId);

  if (error) {
    return { error: "Could not revoke this invite." };
  }

  revalidatePath(`/clients/${clientId}`);
  return {};
}

export async function previewPortalInviteAction(token: string): Promise<InvitePreview> {
  if (!isUuid(token)) {
    return { error: "invalid" as const };
  }

  await requireAuthState();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_client_portal_invite", { p_token: token });

  if (error) {
    return { error: "invalid" as const };
  }

  const result = readRpc(data);

  if (!result.ok) {
    return { error: (result.error as "invalid" | "used" | "expired") ?? "invalid" };
  }

  return {
    workspaceName: result.workspaceName ?? "Workspace",
    clientName: result.clientName ?? "Client",
  };
}

export async function acceptPortalInviteAction(token: string) {
  if (!isUuid(token)) {
    return { error: "This invite link is not valid." };
  }

  await requireAuthState();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_client_portal_invite", { p_token: token });

  if (error) {
    return { error: "Could not join this workspace. Try again." };
  }

  const result = readRpc(data);

  if (!result.ok) {
    switch (result.error) {
      case "used":
        return { error: "This invite has already been used." };
      case "expired":
        return { error: "This invite has expired. Ask for a new link." };
      case "already_member":
        return { error: "This account already belongs to that workspace." };
      case "sign_in":
        return { error: "Sign in to accept this invite." };
      default:
        return { error: "This invite link is not valid." };
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}
