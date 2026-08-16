"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthState } from "@/lib/auth/session";
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
    redirect("/");
  }

  const supabase = await createClient();
  const { fullName, workspaceName, currency, timezone } = parsed.data;

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: state.user.id,
    full_name: fullName,
    timezone,
  });

  if (profileError) {
    return { error: "Could not save your profile. Try again." };
  }

  const { error: workspaceError } = await supabase.from("workspaces").insert({
    name: workspaceName,
    slug: slugifyWorkspaceName(workspaceName),
    owner_id: state.user.id,
    currency,
    timezone,
  });

  if (workspaceError) {
    return { error: "Could not create your workspace. Try a different name." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
