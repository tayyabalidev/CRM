import { cache } from "react";
import { redirect } from "next/navigation";

import { logServerError } from "@/lib/logging/safe-error";
import { createClient } from "@/lib/supabase/server";
import { isStaleRefreshError } from "@/lib/supabase/stale-session";
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

export const getAuthState = cache(async (): Promise<AuthState | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && isStaleRefreshError(error)) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Cookie clear may fail in a Server Component; proxy handles the rest.
    }
    return null;
  }

  if (!user) {
    return null;
  }

  const [{ data: profile }, membershipResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, timezone, phone")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("workspace_members")
      .select("role, client_id, workspace_id, workspaces ( id, name, slug, currency, timezone, logo_url )")
      .eq("user_id", user.id),
  ]);

  if (membershipResult.error) {
    logServerError("auth.memberships", membershipResult.error);
  }

  const memberships = membershipResult.data;

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

  if (workspaces.length === 0) {
    const { data: owned } = await supabase
      .from("workspaces")
      .select("id, name, slug, currency, timezone, logo_url")
      .eq("owner_id", user.id);

    for (const workspace of owned ?? []) {
      workspaces.push({
        ...workspace,
        role: "owner",
        clientId: null,
      });
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
    },
    profile,
    workspaces,
  };
});

export async function requireAuthState() {
  const state = await getAuthState();

  if (!state) {
    redirect("/login");
  }

  return state;
}
