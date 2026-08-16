import { isStaffRole } from "@/types/index";

import type { AuthWorkspace } from "@/lib/auth/session";

export const ACTIVE_WORKSPACE_COOKIE = "workflow_workspace_id";

export function pickActiveWorkspace(
  workspaces: AuthWorkspace[],
  preferredId?: string | null,
): AuthWorkspace | null {
  if (workspaces.length === 0) {
    return null;
  }

  if (preferredId) {
    const preferred = workspaces.find((workspace) => workspace.id === preferredId);
    if (preferred) {
      return preferred;
    }
  }

  const staff = workspaces.find((workspace) => isStaffRole(workspace.role));
  return staff ?? workspaces[0] ?? null;
}
