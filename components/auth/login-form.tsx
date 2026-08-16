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
import { loginAction } from "@/lib/actions/auth";
import { AUTH_PATHS, isInviteJoinPath } from "@/lib/auth/paths";
import { type LoginInput, loginSchema } from "@/lib/validations/auth";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <AuthShell
      title="Sign in"
      description={
        nextPath && isInviteJoinPath(nextPath)
          ? "Sign in to accept your invite, or continue to your workspace."
          : "Welcome back. Continue managing your freelance work."
      }
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href={nextPath ? `${AUTH_PATHS.signup}?next=${encodeURIComponent(nextPath)}` : AUTH_PATHS.signup}
            className="font-medium text-foreground hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          setFormError(null);
          startTransition(async () => {
            const result = await loginAction(values, nextPath);
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
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">Password</Label>
            <Link
              href={AUTH_PATHS.forgotPassword}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
          />
          <FieldError message={form.formState.errors.password?.message} />
        </div>
        {formError ? <FieldError message={formError} /> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
