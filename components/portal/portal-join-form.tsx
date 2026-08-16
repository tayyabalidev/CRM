"use client";

import { useState, useTransition } from "react";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { acceptPortalInviteAction } from "@/lib/actions/portal";

export function PortalJoinForm({
  token,
  workspaceName,
  clientName,
}: {
  token: string;
  workspaceName: string;
  clientName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Join <span className="font-medium">{workspaceName}</span> to view work for{" "}
        <span className="font-medium">{clientName}</span>.
      </p>
      <Button
        className="w-full"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await acceptPortalInviteAction(token);
            if (result?.error) {
              setError(result.error);
            }
          });
        }}
      >
        {pending ? "Joining..." : "Join portal"}
      </Button>
      <FieldError message={error ?? undefined} />
    </div>
  );
}
