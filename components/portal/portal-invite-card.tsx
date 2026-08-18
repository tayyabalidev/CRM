"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createPortalInviteAction, revokePortalInviteAction } from "@/lib/actions/portal";
import type { PortalAccess } from "@/lib/services/portal";
import { copyToClipboard } from "@/lib/utils";
import { formatDate } from "@/lib/utils/dates";

export function PortalInviteCard({
  clientId,
  access,
  timeZone,
  siteUrl,
}: {
  clientId: string;
  access: PortalAccess;
  timeZone: string;
  siteUrl: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function inviteUrl(token: string) {
    return `${siteUrl}/portal/join?token=${token}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client portal</CardTitle>
        <CardDescription>
          Share a link. They sign in (or create an account) and only see this client’s work.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {access.members.length > 0 ? (
          <ul className="space-y-2">
            {access.members.map((member) => (
              <li key={member.id} className="text-sm">
                <span className="font-medium">{member.name}</span>
                <span className="text-muted-foreground"> · joined {formatDate(member.joinedAt, timeZone)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No portal users yet.</p>
        )}

        {access.invites.map((invite) => (
          <div key={invite.id} className="space-y-2 rounded-lg border p-3">
            <Input readOnly value={inviteUrl(invite.token)} />
            <p className="text-xs text-muted-foreground">Expires {formatDate(invite.expiresAt, timeZone)}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const copied = await copyToClipboard(inviteUrl(invite.token));
                  toast(copied ? "Invite link copied" : "Invite link ready — copy it from the field");
                }}
              >
                Copy link
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await revokePortalInviteAction(invite.id, clientId);
                    if (result.error) {
                      setError(result.error);
                    }
                  });
                }}
              >
                Revoke
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await createPortalInviteAction(clientId);
              if ("error" in result) {
                setError(result.error);
                return;
              }
              if (result.emailSent) {
                toast("Invite sent via email");
              } else {
                const copied = await copyToClipboard(inviteUrl(result.token));
                toast(copied ? "Invite link copied" : "Invite link ready — copy it from the field");
              }
            });
          }}
        >
          {pending ? "Working..." : "Create invite link"}
        </Button>
        <FieldError message={error ?? undefined} />
      </CardContent>
    </Card>
  );
}
