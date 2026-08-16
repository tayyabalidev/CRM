import { notFound } from "next/navigation";

import { InvoiceDetailView } from "@/components/invoices/invoice-detail";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getInvoiceDetail } from "@/lib/services/invoices";
import { listPaymentClients, listPaymentProjects } from "@/lib/services/payments";
import { addCalendarDays, zonedDateKey } from "@/lib/utils/dates";
import { isUuid } from "@/lib/utils/ids";
import { isStaffRole } from "@/types/index";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const { workspace, user, profile } = await requireWorkspace();
  const detail = await getInvoiceDetail(workspace.id, id, workspace.timezone);

  if (!detail) {
    notFound();
  }

  const [clients, projects] = await Promise.all([
    listPaymentClients(workspace.id),
    listPaymentProjects(workspace.id),
  ]);
  const todayKey = zonedDateKey(new Date(), workspace.timezone);

  return (
    <InvoiceDetailView
      detail={detail}
      clients={clients.map((client) => ({ id: client.id, name: client.name }))}
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        clientId: project.client_id,
      }))}
      currency={workspace.currency}
      timeZone={workspace.timezone}
      canManage={isStaffRole(workspace.role)}
      issuerName={workspace.name}
      issuerEmail={isStaffRole(workspace.role) ? user.email : null}
      issuerPhone={isStaffRole(workspace.role) ? profile?.phone : null}
      defaultDate={todayKey}
      defaultDueDate={addCalendarDays(todayKey, 14)}
    />
  );
}
