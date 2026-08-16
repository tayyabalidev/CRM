"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthState } from "@/lib/auth/session";
import { requireStaff } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/ids";
import { teamInviteSchema, teamRoleSchema } from "@/lib/validations/settings";
import { canManageWorkspace, type StaffInviteRole } from "@/types/index";

const INVITE_DAYS = 14;

type RpcResult = {
  ok?: boolean;
  error?: string;
  workspaceName?: string;
  role?: string;
};

function readRpc(data: unknown): RpcResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  return data as RpcResult;
}

function revalidateTeam() {
  revalidatePath("/", "layout");
  revalidatePath("/settings");
}

export async function createTeamInviteAction(input: unknown): Promise<{ token: string } | { error: string }> {
  const parsed = teamInviteSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Choose a role for this invite." };
  }

  const { workspace, user } = await requireStaff();

  if (!canManageWorkspace(workspace.role)) {
    return { error: "You do not have permission to invite teammates." };
  }

  if (parsed.data.role === "admin" && workspace.role !== "owner") {
    return { error: "Only the owner can invite admins." };
  }

  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspace.id,
      role: parsed.data.role,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select("token")
    .single();

  if (error || !data) {
    return { error: "Could not create this invite. Try again." };
  }

  revalidateTeam();
  return { token: data.token };
}

export async function revokeTeamInviteAction(inviteId: string) {
  if (!isUuid(inviteId)) {
    return { error: "Invite not found." };
  }

  const { workspace } = await requireStaff();

  if (!canManageWorkspace(workspace.role)) {
    return { error: "You do not have permission to revoke invites." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_invites")
    .delete()
    .eq("id", inviteId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not revoke this invite." };
  }

  revalidateTeam();
  return {};
}

export async function updateTeamRoleAction(input: unknown) {
  const parsed = teamRoleSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Choose a valid role." };
  }

  const { workspace, user } = await requireStaff();

  if (!canManageWorkspace(workspace.role)) {
    return { error: "You do not have permission to change roles." };
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("workspace_members")
    .select("id, user_id, role")
    .eq("id", parsed.data.memberId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!member) {
    return { error: "Team member not found." };
  }

  if (member.user_id === user.id) {
    return { error: "You cannot change your own role." };
  }

  if (member.role === "owner" || member.role === "client") {
    return { error: "This person’s role cannot be changed here." };
  }

  if (parsed.data.role === "admin" && workspace.role !== "owner") {
    return { error: "Only the owner can assign admins." };
  }

  if (member.role === "admin" && workspace.role !== "owner") {
    return { error: "Only the owner can change an admin’s role." };
  }

  const { error } = await supabase
    .from("workspace_members")
    .update({ role: parsed.data.role })
    .eq("id", member.id)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not update this role. Try again." };
  }

  revalidateTeam();
  return {};
}

export async function removeTeamMemberAction(memberId: string) {
  if (!isUuid(memberId)) {
    return { error: "Team member not found." };
  }

  const { workspace, user } = await requireStaff();

  if (!canManageWorkspace(workspace.role)) {
    return { error: "You do not have permission to remove teammates." };
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("workspace_members")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!member) {
    return { error: "Team member not found." };
  }

  if (member.user_id === user.id) {
    return { error: "You cannot remove yourself." };
  }

  if (member.role === "owner" || member.role === "client") {
    return { error: "This person cannot be removed here." };
  }

  if (member.role === "admin" && workspace.role !== "owner") {
    return { error: "Only the owner can remove an admin." };
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", member.id)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not remove this teammate." };
  }

  revalidateTeam();
  return {};
}

type InvitePreview = { workspaceName: string; role: StaffInviteRole } | { error: "invalid" | "used" | "expired" };

export async function previewTeamInviteAction(token: string): Promise<InvitePreview> {
  if (!isUuid(token)) {
    return { error: "invalid" };
  }

  await requireAuthState();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_workspace_invite", { p_token: token });

  if (error) {
    return { error: "invalid" };
  }

  const result = readRpc(data);

  if (!result.ok) {
    return { error: (result.error as "invalid" | "used" | "expired") ?? "invalid" };
  }

  const role = result.role === "admin" ? "admin" : "member";

  return {
    workspaceName: result.workspaceName ?? "Workspace",
    role,
  };
}

export async function acceptTeamInviteAction(token: string) {
  if (!isUuid(token)) {
    return { error: "This invite link is not valid." };
  }

  await requireAuthState();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_workspace_invite", { p_token: token });

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
        return { error: "This account already belongs to a workspace." };
      case "sign_in":
        return { error: "Sign in to accept this invite." };
      default:
        return { error: "This invite link is not valid." };
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}
