import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { PortalJoinForm } from "@/components/portal/portal-join-form";
import { previewPortalInviteAction } from "@/lib/actions/portal";
import { AUTH_PATHS } from "@/lib/auth/paths";
import { getAuthState } from "@/lib/auth/session";
import { isUuid } from "@/lib/utils/ids";

export const metadata: Metadata = {
  title: "Join client portal",
};

export const dynamic = "force-dynamic";

const inviteErrors: Record<string, string> = {
  invalid: "This invite link is not valid.",
  used: "This invite has already been used.",
  expired: "This invite has expired. Ask for a new link.",
};

export default async function PortalJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";
  const nextPath = `/portal/join?token=${encodeURIComponent(token)}`;

  if (!isUuid(token)) {
    return (
      <AuthShell title="Invite not valid" description="This client portal link is missing or broken.">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href={AUTH_PATHS.login} className="font-medium hover:underline">
            Sign in
          </Link>
          <Link href={AUTH_PATHS.signup} className="font-medium hover:underline">
            Create account
          </Link>
        </div>
      </AuthShell>
    );
  }

  const preview = await previewPortalInviteAction(token);

  if ("error" in preview) {
    return (
      <AuthShell
        title="Invite not valid"
        description={inviteErrors[preview.error ?? "invalid"] ?? inviteErrors.invalid}
        footer={
          <Link href={AUTH_PATHS.login} className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">Ask the workspace to send a new link.</p>
      </AuthShell>
    );
  }

  const state = await getAuthState();
  if (!state) {
    return (
      <AuthShell
        title="Client portal invite"
        description={`You were invited to ${preview.workspaceName} for ${preview.clientName}.`}
        footer={
          <span>
            Already have an account?{" "}
            <Link
              href={`${AUTH_PATHS.login}?next=${encodeURIComponent(nextPath)}`}
              className="font-medium text-foreground hover:underline"
            >
              Sign in
            </Link>
          </span>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in or create an account to accept this invite and access your shared projects, files, and
            invoices.
          </p>
          <Link
            href={`${AUTH_PATHS.signup}?next=${encodeURIComponent(nextPath)}`}
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Create account to continue
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Client portal invite"
      description="You will only see this client’s projects, tasks, files, invoices, and notes."
    >
      <PortalJoinForm token={token} workspaceName={preview.workspaceName} clientName={preview.clientName} />
    </AuthShell>
  );
}
