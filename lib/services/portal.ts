import { createClient } from "@/lib/supabase/server";

export type PortalMember = {
  id: string;
  userId: string;
  name: string;
  joinedAt: string;
};

export type PortalInvite = {
  id: string;
  token: string;
  expiresAt: string;
  createdAt: string;
};

export type PortalAccess = {
  members: PortalMember[];
  invites: PortalInvite[];
};

export async function getPortalAccess(workspaceId: string, clientId: string): Promise<PortalAccess> {
  const supabase = await createClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("id, user_id, created_at, profiles ( full_name )")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .eq("role", "client")
      .order("created_at", { ascending: false }),
    supabase
      .from("portal_invites")
      .select("id, token, expires_at, created_at")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  return {
    members: (members ?? []).map((member) => {
      const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
      return {
        id: member.id,
        userId: member.user_id,
        name: profile?.full_name?.trim() || "Portal user",
        joinedAt: member.created_at,
      };
    }),
    invites: (invites ?? []).map((invite) => ({
      id: invite.id,
      token: invite.token,
      expiresAt: invite.expires_at,
      createdAt: invite.created_at,
    })),
  };
}
