import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type AuthWorkspace = Pick<
  Tables<"workspaces">,
  "id" | "name" | "slug" | "currency" | "timezone" | "logo_url"
> & {
  role: Tables<"workspace_members">["role"];
  clientId: string | null;
};

export type AuthProfile = Pick<
  Tables<"profiles">,
  "id" | "full_name" | "avatar_url" | "timezone" | "phone"
>;

export type AuthState = {
  user: {
    id: string;
    email: string;
  };
  profile: AuthProfile | null;
  workspaces: AuthWorkspace[];
};

export async function getAuthState(): Promise<AuthState | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, timezone, phone")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("workspace_members")
      .select("role, client_id, workspaces ( id, name, slug, currency, timezone, logo_url )")
      .eq("user_id", user.id),
  ]);

  const workspaces: AuthWorkspace[] = (memberships ?? [])
    .flatMap((membership) => {
      const related = membership.workspaces;
      const workspace = Array.isArray(related) ? related[0] : related;

      if (!workspace) {
        return [];
      }

      return [
        {
          ...workspace,
          role: membership.role,
          clientId: membership.client_id,
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
    },
    profile,
    workspaces,
  };
}

export async function requireAuthState() {
  const state = await getAuthState();

  if (!state) {
    redirect("/login");
  }

  return state;
}
