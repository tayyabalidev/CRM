"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/auth/active-workspace";
import { requireAuthState } from "@/lib/auth/session";
import { isUuid } from "@/lib/utils/ids";

export async function switchWorkspaceAction(workspaceId: string) {
  if (!isUuid(workspaceId)) {
    return { error: "Workspace not found." };
  }

  const state = await requireAuthState();
  const allowed = state.workspaces.some((workspace) => workspace.id === workspaceId);

  if (!allowed) {
    return { error: "Workspace not found." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  return {};
}
