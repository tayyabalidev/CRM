import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { PortalJoinForm } from "@/components/portal/portal-join-form";
import { previewPortalInviteAction } from "@/lib/actions/portal";
import { AUTH_PATHS } from "@/lib/auth/paths";
import { requireAuthState } from "@/lib/auth/session";
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
  await requireAuthState();
  const token = (await searchParams).token ?? "";

  if (!isUuid(token)) {
    return (
      <AuthShell title="Invite not valid" description="This client portal link is missing or broken.">
        <Link href="/" className="text-sm font-medium hover:underline">
          Go to the dashboard
        </Link>
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

  return (
    <AuthShell
      title="Client portal invite"
      description="You will only see this client’s projects, tasks, files, invoices, and notes."
    >
      <PortalJoinForm token={token} workspaceName={preview.workspaceName} clientName={preview.clientName} />
    </AuthShell>
  );
}
