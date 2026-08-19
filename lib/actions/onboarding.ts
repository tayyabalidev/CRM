"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthState } from "@/lib/auth/session";
import { logServerError } from "@/lib/logging/safe-error";
import { createClient } from "@/lib/supabase/server";
import { slugifyWorkspaceName } from "@/lib/utils/slug";
import { onboardingSchema } from "@/lib/validations/onboarding";

export async function completeOnboardingAction(input: unknown) {
  const parsed = onboardingSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const state = await requireAuthState();

  if (state.workspaces.length > 0) {
    revalidatePath("/", "layout");
    return { ok: true as const };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    logServerError("onboarding.auth", authError ?? new Error("No user"));
    redirect("/login");
  }

  const { fullName, workspaceName, currency, timezone } = parsed.data;
  const { data: workspaceId, error: onboardingError } = await supabase.rpc("complete_onboarding", {
    p_full_name: fullName,
    p_workspace_name: workspaceName,
    p_workspace_slug: slugifyWorkspaceName(workspaceName),
    p_currency: currency,
    p_timezone: timezone,
  });

  if (onboardingError || !workspaceId) {
    logServerError("onboarding.complete", onboardingError ?? new Error("No workspace id returned"));
    return { error: "Could not create your workspace. Try again." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/onboarding");
  return { ok: true as const };
}
