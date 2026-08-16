import type { Metadata } from "next";

import { CurrencySettingsForm } from "@/components/settings/currency-settings-form";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { SecuritySettingsForm } from "@/components/settings/security-settings-form";
import { TeamSettingsCard } from "@/components/settings/team-settings-card";
import { TimezoneSettingsForm } from "@/components/settings/timezone-settings-form";
import { WorkspaceSettingsForm } from "@/components/settings/workspace-settings-form";
import { requireStaff } from "@/lib/auth/workspace";
import { getSettingsPageData } from "@/lib/services/settings";
import { getSiteUrl } from "@/lib/utils/site-url";
import { canManageWorkspace } from "@/types/index";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { workspace, user, profile } = await requireStaff();
  const canManage = canManageWorkspace(workspace.role);
  const [data, siteUrl] = await Promise.all([getSettingsPageData(workspace.id, user.id), getSiteUrl()]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Profile, workspace, team, and security for {workspace.name}.
        </p>
      </div>

      <div className="grid max-w-2xl gap-4">
        <ProfileSettingsForm
          defaults={{
            fullName: profile?.full_name ?? "",
            phone: profile?.phone ?? "",
            timezone: profile?.timezone || workspace.timezone,
          }}
        />
        <WorkspaceSettingsForm
          canManage={canManage}
          defaults={{
            name: workspace.name,
            logoUrl: workspace.logo_url ?? "",
          }}
        />
        <TeamSettingsCard
          members={data.members}
          invites={canManage ? data.invites : []}
          currentUserId={user.id}
          currentRole={workspace.role}
          timeZone={workspace.timezone}
          siteUrl={siteUrl}
        />
        <CurrencySettingsForm canManage={canManage} defaults={{ currency: workspace.currency }} />
        <TimezoneSettingsForm canManage={canManage} defaults={{ timezone: workspace.timezone }} />
        <NotificationSettingsForm
          defaults={{
            notifyInApp: data.notifyInApp,
            notifyEmail: data.notifyEmail,
          }}
        />
        <SecuritySettingsForm email={user.email} />
      </div>
    </div>
  );
}
