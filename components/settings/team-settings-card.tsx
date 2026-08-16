"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createTeamInviteAction,
  removeTeamMemberAction,
  revokeTeamInviteAction,
  updateTeamRoleAction,
} from "@/lib/actions/team";
import type { SettingsInvite, SettingsMember } from "@/lib/services/settings";
import { copyToClipboard } from "@/lib/utils";
import { formatDate } from "@/lib/utils/dates";
import { canManageWorkspace, type StaffInviteRole, type WorkspaceRole } from "@/types/index";

const roleLabels: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  client: "Client",
};

export function TeamSettingsCard({
  members,
  invites,
  currentUserId,
  currentRole,
  timeZone,
  siteUrl,
}: {
  members: SettingsMember[];
  invites: SettingsInvite[];
  currentUserId: string;
  currentRole: WorkspaceRole;
  timeZone: string;
  siteUrl: string;
}) {
  const canManage = canManageWorkspace(currentRole);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [inviteRole, setInviteRole] = useState<StaffInviteRole>("member");
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [revokeInviteId, setRevokeInviteId] = useState<string | null>(null);

  function inviteUrl(token: string) {
    return `${siteUrl}/invite/join?token=${token}`;
  }

  const removeMember = members.find((member) => member.id === removeMemberId);
  const revokeInvite = invites.find((invite) => invite.id === revokeInviteId);

  return (
    <Card id="team">
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          People with access to this workspace. Share a link to invite — no paid email service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y rounded-lg border">
          {members.map((member) => {
            const canEdit =
              canManage &&
              member.userId !== currentUserId &&
              member.role !== "owner" &&
              (member.role !== "admin" || currentRole === "owner");

            return (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">Joined {formatDate(member.joinedAt, timeZone)}</p>
                </div>
                {canEdit ? (
                  <div className="flex items-center gap-2">
                    <Select
                      className="w-28"
                      defaultValue={member.role}
                      disabled={pending}
                      onChange={(event) => {
                        const role = event.currentTarget.value as StaffInviteRole;
                        setError(null);
                        startTransition(async () => {
                          const result = await updateTeamRoleAction({ memberId: member.id, role });
                          if (result.error) {
                            setError(result.error);
                            return;
                          }
                          toast.success("Role updated");
                        });
                      }}
                    >
                      <option value="member">Member</option>
                      {currentRole === "owner" || member.role === "admin" ? (
                        <option value="admin">Admin</option>
                      ) : null}
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => setRemoveMemberId(member.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{roleLabels[member.role]}</p>
                )}
              </li>
            );
          })}
        </ul>

        {canManage ? (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="space-y-2 rounded-lg border p-3">
                <Input readOnly value={inviteUrl(invite.token)} />
                <p className="text-xs text-muted-foreground">
                  {roleLabels[invite.role]} · expires {formatDate(invite.expiresAt, timeZone)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const copied = await copyToClipboard(inviteUrl(invite.token));
                      toast.success(copied ? "Invite link copied" : "Invite link ready — copy it from the field");
                    }}
                  >
                    Copy link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => setRevokeInviteId(invite.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-2">
              <Select
                className="w-32"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.currentTarget.value as StaffInviteRole)}
              >
                <option value="member">Member</option>
                {currentRole === "owner" ? <option value="admin">Admin</option> : null}
              </Select>
              <Button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await createTeamInviteAction({ role: inviteRole });
                    if ("error" in result) {
                      setError(result.error);
                      return;
                    }
                    const copied = await copyToClipboard(inviteUrl(result.token));
                    toast.success(copied ? "Invite link copied" : "Invite link ready — copy it from the field");
                  });
                }}
              >
                {pending ? "Working..." : "Create invite link"}
              </Button>
            </div>
          </div>
        ) : null}
        <FieldError message={error ?? undefined} />
      </CardContent>

      <ConfirmDialog
        open={Boolean(removeMemberId)}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveMemberId(null);
          }
        }}
        title={`Remove ${removeMember?.name ?? "teammate"}?`}
        description="They will lose access to this workspace immediately."
        confirmLabel="Remove teammate"
        pendingLabel="Removing…"
        onConfirm={async () => {
          if (!removeMemberId) {
            return;
          }
          const result = await removeTeamMemberAction(removeMemberId);
          if (result.error) {
            return result.error;
          }
          toast.success("Teammate removed");
          setRemoveMemberId(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(revokeInviteId)}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeInviteId(null);
          }
        }}
        title="Revoke invite link?"
        description={
          revokeInvite
            ? `This ${roleLabels[revokeInvite.role]} invite will stop working right away.`
            : "This invite will stop working right away."
        }
        confirmLabel="Revoke invite"
        pendingLabel="Revoking…"
        onConfirm={async () => {
          if (!revokeInviteId) {
            return;
          }
          const result = await revokeTeamInviteAction(revokeInviteId);
          if (result.error) {
            return result.error;
          }
          toast.success("Invite revoked");
          setRevokeInviteId(null);
        }}
      />
    </Card>
  );
}
