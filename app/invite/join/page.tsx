import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { TeamJoinForm } from "@/components/settings/team-join-form";
import { previewTeamInviteAction } from "@/lib/actions/team";
import { AUTH_PATHS } from "@/lib/auth/paths";
import { requireAuthState } from "@/lib/auth/session";
import { isUuid } from "@/lib/utils/ids";

export const metadata: Metadata = {
  title: "Join workspace",
};

export const dynamic = "force-dynamic";

const inviteErrors: Record<string, string> = {
  invalid: "This invite link is not valid.",
  used: "This invite has already been used.",
  expired: "This invite has expired. Ask for a new link.",
};

export default async function TeamJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await requireAuthState();
  const token = (await searchParams).token ?? "";

  if (!isUuid(token)) {
    return (
      <AuthShell title="Invite not valid" description="This workspace invite link is missing or broken.">
        <Link href="/" className="text-sm font-medium hover:underline">
          Go to the dashboard
        </Link>
      </AuthShell>
    );
  }

  const preview = await previewTeamInviteAction(token);

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
        <p className="text-sm text-muted-foreground">Ask the workspace owner to send a new link.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Workspace invite"
      description="You will join as a teammate and see this workspace’s clients and projects."
    >
      <TeamJoinForm token={token} workspaceName={preview.workspaceName} role={preview.role} />
    </AuthShell>
  );
}
