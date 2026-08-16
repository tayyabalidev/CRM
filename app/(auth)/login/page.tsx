import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { AUTH_PATHS, safeNextPath } from "@/lib/auth/paths";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next ? safeNextPath(params.next) : undefined;

  return <LoginForm nextPath={nextPath === AUTH_PATHS.login ? undefined : nextPath} />;
}
