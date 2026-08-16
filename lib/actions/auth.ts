"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toUserFacingAuthError } from "@/lib/auth/errors";
import { AUTH_PATHS, isInviteJoinPath, safeNextPath } from "@/lib/auth/paths";
import { getAuthState } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/utils/site-url";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validations/auth";

export async function loginAction(input: unknown, nextPath?: string) {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: toUserFacingAuthError(error.message) };
  }

  const state = await getAuthState();
  revalidatePath("/", "layout");

  const next = safeNextPath(nextPath);

  if (isInviteJoinPath(next)) {
    redirect(next);
  }

  if (!state?.workspaces.length) {
    redirect(AUTH_PATHS.onboarding);
  }

  redirect(next);
}

export async function signupAction(input: unknown, nextPath?: string) {
  const parsed = signupSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const next = safeNextPath(nextPath);
  const afterSignup = isInviteJoinPath(next) ? next : AUTH_PATHS.onboarding;
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}${AUTH_PATHS.callback}?next=${encodeURIComponent(afterSignup)}`,
    },
  });

  if (error) {
    return { error: toUserFacingAuthError(error.message) };
  }

  if (!data.session) {
    return {
      error: null,
      needsConfirmation: true,
    };
  }

  revalidatePath("/", "layout");
  redirect(afterSignup);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(AUTH_PATHS.login);
}

export async function forgotPasswordAction(input: unknown) {
  const parsed = forgotPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Enter a valid email." };
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}${AUTH_PATHS.callback}?next=${AUTH_PATHS.resetPassword}`,
  });

  if (error) {
    return { error: toUserFacingAuthError(error.message) };
  }

  return { error: null, sent: true };
}

export async function resetPasswordAction(input: unknown) {
  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: toUserFacingAuthError(error.message) };
  }

  const state = await getAuthState();
  revalidatePath("/", "layout");

  if (!state?.workspaces.length) {
    redirect(AUTH_PATHS.onboarding);
  }

  redirect("/");
}
