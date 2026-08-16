import { createClient } from "@/lib/supabase/server";
import type { StaffInviteRole, WorkspaceRole } from "@/types/index";

export type SettingsMember = {
  id: string;
  userId: string;
  name: string;
  role: WorkspaceRole;
  joinedAt: string;
};

export type SettingsInvite = {
  id: string;
  token: string;
  role: StaffInviteRole;
  expiresAt: string;
  createdAt: string;
};

export type SettingsPageData = {
  notifyInApp: boolean;
  notifyEmail: boolean;
  members: SettingsMember[];
  invites: SettingsInvite[];
};

function relatedProfile(
  value: { full_name: string | null } | { full_name: string | null }[] | null | undefined,
) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getSettingsPageData(workspaceId: string, userId: string): Promise<SettingsPageData> {
  const supabase = await createClient();
  const [{ data: profile }, { data: members }, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("notify_in_app, notify_email").eq("id", userId).maybeSingle(),
    supabase
      .from("workspace_members")
      .select("id, user_id, role, created_at, profiles ( full_name )")
      .eq("workspace_id", workspaceId)
      .in("role", ["owner", "admin", "member"])
      .order("created_at", { ascending: true }),
    supabase
      .from("workspace_invites")
      .select("id, token, role, expires_at, created_at")
      .eq("workspace_id", workspaceId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  return {
    notifyInApp: profile?.notify_in_app ?? true,
    notifyEmail: profile?.notify_email ?? false,
    members: (members ?? []).map((member) => {
      const person = relatedProfile(member.profiles);
      return {
        id: member.id,
        userId: member.user_id,
        name: person?.full_name?.trim() || "Team member",
        role: member.role,
        joinedAt: member.created_at,
      };
    }),
    invites: (invites ?? [])
      .filter((invite): invite is typeof invite & { role: StaffInviteRole } => {
        return invite.role === "admin" || invite.role === "member";
      })
      .map((invite) => ({
        id: invite.id,
        token: invite.token,
        role: invite.role,
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
      })),
  };
}
