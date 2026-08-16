"use server";

import { requireWorkspace } from "@/lib/auth/workspace";
import { searchWorkspace, type SearchHit } from "@/lib/services/search";

export async function searchWorkspaceAction(query: string): Promise<SearchHit[]> {
  const { workspace } = await requireWorkspace();
  return searchWorkspace(workspace.id, query, {
    role: workspace.role,
    clientId: workspace.clientId,
  });
}
