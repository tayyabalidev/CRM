import { notFound } from "next/navigation";

import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { PrintInvoiceActions } from "@/components/invoices/print-invoice-actions";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getInvoiceDetail } from "@/lib/services/invoices";
import { isUuid } from "@/lib/utils/ids";
import { isStaffRole } from "@/types/index";

export default async function PrintInvoicePage({
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

  return (
    <div className="space-y-6 p-6 print:p-0">
      <PrintInvoiceActions />
      <InvoiceDocument
        detail={detail}
        issuerName={workspace.name}
        issuerEmail={isStaffRole(workspace.role) ? user.email : null}
        issuerPhone={isStaffRole(workspace.role) ? profile?.phone : null}
        currency={workspace.currency}
        timeZone={workspace.timezone}
      />
    </div>
  );
}
