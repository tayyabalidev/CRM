import { notFound } from "next/navigation";

import { requireWorkspace } from "@/lib/auth/workspace";
import { buildInvoicePdf } from "@/lib/invoices/pdf";
import { getInvoiceDetail } from "@/lib/services/invoices";
import { isUuid } from "@/lib/utils/ids";
import { isStaffRole } from "@/types/index";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const { workspace, user, profile } = await requireWorkspace();
  const detail = await getInvoiceDetail(workspace.id, id, workspace.timezone);

  if (!detail) {
    notFound();
  }

  const bytes = await buildInvoicePdf(
    detail,
    {
      name: workspace.name,
      email: isStaffRole(workspace.role) ? user.email : null,
      phone: isStaffRole(workspace.role) ? profile?.phone : null,
    },
    workspace.currency,
    workspace.timezone,
  );
  const filename = `${detail.invoiceNumber.replace(/[^\w.-]+/g, "-")}.pdf`;

  const payload = Buffer.from(bytes);

  return new Response(payload, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
