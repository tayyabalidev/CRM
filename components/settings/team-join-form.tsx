"use client";

import { useState, useTransition } from "react";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { acceptTeamInviteAction } from "@/lib/actions/team";
import type { StaffInviteRole } from "@/types/index";

const roleLabels: Record<StaffInviteRole, string> = {
  admin: "admin",
  member: "member",
};

export function TeamJoinForm({
  token,
  workspaceName,
  role,
}: {
  token: string;
  workspaceName: string;
  role: StaffInviteRole;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Join <span className="font-medium">{workspaceName}</span> as {roleLabels[role]}.
      </p>
      <Button
        className="w-full"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await acceptTeamInviteAction(token);
            if (result?.error) {
              setError(result.error);
            }
          });
        }}
      >
        {pending ? "Joining..." : "Join workspace"}
      </Button>
      <FieldError message={error ?? undefined} />
    </div>
  );
}
