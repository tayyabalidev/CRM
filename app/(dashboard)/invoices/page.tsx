import { Plus } from "lucide-react";

import { InvoiceFormSheet } from "@/components/invoices/invoice-form-sheet";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { InvoicePagination } from "@/components/invoices/invoice-pagination";
import { InvoiceSummary } from "@/components/invoices/invoice-summary";
import { InvoiceToolbar } from "@/components/invoices/invoice-toolbar";
import { Button } from "@/components/ui/button";
import { requireWorkspace } from "@/lib/auth/workspace";
import { parseInvoiceListParams } from "@/lib/invoices/params";
import { getInvoicePageData } from "@/lib/services/invoices";
import { listPaymentClients, listPaymentProjects } from "@/lib/services/payments";
import { addCalendarDays, zonedDateKey } from "@/lib/utils/dates";
import { isStaffRole } from "@/types/index";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    client?: string;
    project?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const params = parseInvoiceListParams(await searchParams);
  const { workspace } = await requireWorkspace();
  const canManage = isStaffRole(workspace.role);
  const todayKey = zonedDateKey(new Date(), workspace.timezone);
  const dueDate = addCalendarDays(todayKey, 14);
  const [result, clients, projects] = await Promise.all([
    getInvoicePageData(workspace.id, workspace.timezone, params),
    listPaymentClients(workspace.id),
    listPaymentProjects(workspace.id),
  ]);
  const clientOptions = clients.map((client) => ({ id: client.id, name: client.name }));
  const projectOptions = projects.map((project) => ({
    id: project.id,
    name: project.name,
    clientId: project.client_id,
  }));
  const defaultProject = projectOptions.find((project) => project.id === params.projectId);
  const defaultClientId = params.clientId || defaultProject?.clientId;
  const hasFilters =
    Boolean(params.q) || Boolean(params.clientId) || Boolean(params.projectId) || params.status !== "all";
  const addButton = canManage ? (
    <InvoiceFormSheet
      clients={clientOptions}
      projects={projectOptions}
      currency={workspace.currency}
      defaultIssueDate={todayKey}
      defaultDueDate={dueDate}
      defaultClientId={defaultClientId}
      defaultProjectId={params.projectId || undefined}
      trigger={
        <Button>
          <Plus /> Create invoice
        </Button>
      }
    />
  ) : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Create professional invoices, mark them sent, and track remaining balances."
              : "Invoices issued to you. Drafts stay internal until they are sent."}
          </p>
        </div>
        {addButton}
      </div>

      <InvoiceSummary
        outstanding={result.outstanding}
        overdue={result.overdue}
        paid={result.paid}
        draftCount={result.draftCount}
        currency={workspace.currency}
        showDrafts={canManage}
      />
      <InvoiceToolbar
        params={params}
        clients={clientOptions}
        projects={projectOptions}
        hideClientFilter={!canManage}
        hideDrafts={!canManage}
      />
      <InvoiceList
        invoices={result.invoices}
        timeZone={workspace.timezone}
        currency={workspace.currency}
        canManage={canManage}
        hasFilters={hasFilters}
        emptyAction={addButton ?? undefined}
      />
      <InvoicePagination params={params} page={result.page} pageCount={result.pageCount} total={result.total} />
    </div>
  );
}
