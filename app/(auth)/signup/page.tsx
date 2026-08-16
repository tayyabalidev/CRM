import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";
import { AUTH_PATHS, safeNextPath } from "@/lib/auth/paths";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next ? safeNextPath(params.next) : undefined;

  return <SignupForm nextPath={nextPath === AUTH_PATHS.signup ? undefined : nextPath} />;
}
