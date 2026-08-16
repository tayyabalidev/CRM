import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { requireAuthState } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Set up your workspace",
};

export default async function OnboardingPage() {
  const state = await requireAuthState();

  if (state.workspaces.length > 0) {
    redirect("/");
  }

  const timezone =
    state.profile?.timezone && state.profile.timezone !== "UTC"
      ? state.profile.timezone
      : "UTC";

  return (
    <OnboardingWizard
      defaultName={state.profile?.full_name ?? ""}
      defaultTimezone={timezone}
    />
  );
}
