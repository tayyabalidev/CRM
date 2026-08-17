import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { pickActiveWorkspace, ACTIVE_WORKSPACE_COOKIE } from "@/lib/auth/active-workspace";
import { AUTH_PATHS } from "@/lib/auth/paths";
import { requireAuthState, type AuthState, type AuthWorkspace } from "@/lib/auth/session";
import { isStaffRole } from "@/types/index";

export type WorkspaceContext = AuthState & {
  workspace: AuthWorkspace;
};

export async function requireWorkspace(): Promise<WorkspaceContext> {
  const state = await requireAuthState();
  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null;
  const workspace = pickActiveWorkspace(state.workspaces, preferredId);

  if (!workspace) {
    redirect(AUTH_PATHS.onboarding);
  }

  return { ...state, workspace };
}

export async function requireStaff(): Promise<WorkspaceContext> {
  const ctx = await requireWorkspace();

  if (!isStaffRole(ctx.workspace.role)) {
    redirect(AUTH_PATHS.unauthorized);
  }

  return ctx;
}
