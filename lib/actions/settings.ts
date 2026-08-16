"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/workspace";
import { toUserFacingAuthError } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull } from "@/lib/utils/text";
import { resetPasswordSchema } from "@/lib/validations/auth";
import {
  currencySettingsSchema,
  notificationSettingsSchema,
  profileSettingsSchema,
  timezoneSettingsSchema,
  workspaceSettingsSchema,
} from "@/lib/validations/settings";
import { canManageWorkspace } from "@/types/index";

function revalidateSettings() {
  revalidatePath("/", "layout");
  revalidatePath("/settings");
}

export async function updateProfileSettingsAction(input: unknown) {
  const parsed = profileSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { user } = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: emptyToNull(parsed.data.phone),
      timezone: parsed.data.timezone,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save your profile. Try again." };
  }

  revalidateSettings();
  return {};
}

export async function updateWorkspaceSettingsAction(input: unknown) {
  const parsed = workspaceSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace } = await requireStaff();

  if (!canManageWorkspace(workspace.role)) {
    return { error: "You do not have permission to update this workspace." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({
      name: parsed.data.name,
      logo_url: emptyToNull(parsed.data.logoUrl),
    })
    .eq("id", workspace.id);

  if (error) {
    return { error: "Could not save workspace details. Try again." };
  }

  revalidateSettings();
  return {};
}

export async function updateCurrencySettingsAction(input: unknown) {
  const parsed = currencySettingsSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Choose a currency." };
  }

  const { workspace } = await requireStaff();

  if (!canManageWorkspace(workspace.role)) {
    return { error: "You do not have permission to update currency." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ currency: parsed.data.currency })
    .eq("id", workspace.id);

  if (error) {
    return { error: "Could not save currency. Try again." };
  }

  revalidateSettings();
  return {};
}

export async function updateTimezoneSettingsAction(input: unknown) {
  const parsed = timezoneSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Choose a timezone." };
  }

  const { workspace } = await requireStaff();

  if (!canManageWorkspace(workspace.role)) {
    return { error: "You do not have permission to update timezone." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ timezone: parsed.data.timezone })
    .eq("id", workspace.id);

  if (error) {
    return { error: "Could not save timezone. Try again." };
  }

  revalidateSettings();
  return {};
}

export async function updateNotificationSettingsAction(input: unknown) {
  const parsed = notificationSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Check the form and try again." };
  }

  const { user } = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      notify_in_app: parsed.data.notifyInApp,
      notify_email: parsed.data.notifyEmail,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save notification preferences. Try again." };
  }

  revalidateSettings();
  return {};
}

export async function updatePasswordSettingsAction(input: unknown) {
  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: toUserFacingAuthError(error.message) };
  }

  return {};
}
