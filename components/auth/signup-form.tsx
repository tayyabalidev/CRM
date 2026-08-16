"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { AuthShell } from "@/components/auth/auth-shell";
import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction } from "@/lib/actions/auth";
import { AUTH_PATHS, isInviteJoinPath } from "@/lib/auth/paths";
import { type SignupInput, signupSchema } from "@/lib/validations/auth";

export function SignupForm({ nextPath }: { nextPath?: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  if (needsConfirmation) {
    return (
      <AuthShell
        title="Check your email"
        description="We sent a confirmation link. Open it to finish creating your account."
        footer={
          <Link href={AUTH_PATHS.login} className="font-medium text-foreground hover:underline">
            Back to sign in
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          If you do not see the email, check spam. You can also disable email confirmation in the
          Supabase Auth settings for local development.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      description={
        nextPath && isInviteJoinPath(nextPath)
          ? "Create an account to accept your invite."
          : "Start with a free workspace for your freelance work."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={nextPath ? `${AUTH_PATHS.login}?next=${encodeURIComponent(nextPath)}` : AUTH_PATHS.login}
            className="font-medium text-foreground hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          setFormError(null);
          startTransition(async () => {
            const result = await signupAction(values, nextPath);
            if (result?.needsConfirmation) {
              setNeedsConfirmation(true);
              return;
            }
            if (result?.error) {
              setFormError(result.error);
            }
          });
        })}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          <FieldError message={form.formState.errors.email?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
          <FieldError message={form.formState.errors.password?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...form.register("confirmPassword")}
          />
          <FieldError message={form.formState.errors.confirmPassword?.message} />
        </div>
        {formError ? <FieldError message={formError} /> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
