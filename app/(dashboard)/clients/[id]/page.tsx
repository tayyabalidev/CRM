import { notFound } from "next/navigation";

import { ClientOverview } from "@/components/clients/client-overview";
import { PortalInviteCard } from "@/components/portal/portal-invite-card";
import { requireStaff } from "@/lib/auth/workspace";
import { getClientDetail } from "@/lib/services/clients";
import { getPortalAccess } from "@/lib/services/portal";
import { getSiteUrl } from "@/lib/utils/site-url";
import { isUuid } from "@/lib/utils/ids";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const { workspace, user } = await requireStaff();
  const [detail, access, siteUrl] = await Promise.all([
    getClientDetail(workspace.id, id, workspace.timezone),
    getPortalAccess(workspace.id, id),
    getSiteUrl(),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <ClientOverview
      detail={detail}
      currency={workspace.currency}
      timeZone={workspace.timezone}
      canManage
      role={workspace.role}
      userId={user.id}
      portalAccess={
        <PortalInviteCard clientId={id} access={access} timeZone={workspace.timezone} siteUrl={siteUrl} />
      }
    />
  );
}
