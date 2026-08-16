import { Plus } from "lucide-react";

import { PaymentFormSheet } from "@/components/payments/payment-form-sheet";
import { PaymentList } from "@/components/payments/payment-list";
import { PaymentPagination } from "@/components/payments/payment-pagination";
import { PaymentSummary } from "@/components/payments/payment-summary";
import { PaymentToolbar } from "@/components/payments/payment-toolbar";
import { Button } from "@/components/ui/button";
import { requireWorkspace } from "@/lib/auth/workspace";
import { parsePaymentListParams } from "@/lib/payments/params";
import { getPaymentPageData, listInvoiceOptions, listPaymentClients, listPaymentProjects } from "@/lib/services/payments";
import { zonedDateKey } from "@/lib/utils/dates";
import { isStaffRole } from "@/types/index";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    client?: string;
    project?: string;
    method?: string;
    date?: string;
    page?: string;
  }>;
}) {
  const params = parsePaymentListParams(await searchParams);
  const { workspace } = await requireWorkspace();
  const canManage = isStaffRole(workspace.role);
  const todayKey = zonedDateKey(new Date(), workspace.timezone);
  const [result, clients, projects, invoices] = await Promise.all([
    getPaymentPageData(workspace.id, workspace.timezone, params),
    listPaymentClients(workspace.id),
    listPaymentProjects(workspace.id),
    listInvoiceOptions(workspace.id),
  ]);
  const clientOptions = clients.map((client) => ({ id: client.id, name: client.name }));
  const projectOptions = projects.map((project) => ({
    id: project.id,
    name: project.name,
    clientId: project.client_id,
  }));
  const invoiceOptions = invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
  }));
  const defaultProject = projectOptions.find((project) => project.id === params.projectId);
  const defaultClientId = params.clientId || defaultProject?.clientId;
  const hasFilters =
    Boolean(params.q) ||
    Boolean(params.clientId) ||
    Boolean(params.projectId) ||
    params.method !== "all" ||
    params.date !== "all";
  const addButton = canManage ? (
    <PaymentFormSheet
      clients={clientOptions}
      projects={projectOptions}
      invoices={invoiceOptions}
      currency={workspace.currency}
      defaultDate={todayKey}
      defaultClientId={defaultClientId}
      defaultProjectId={params.projectId || undefined}
      trigger={
        <Button>
          <Plus /> Record payment
        </Button>
      }
    />
  ) : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Record money received by hand. Remaining project balances update automatically."
              : "Payments recorded against your invoices and projects."}
          </p>
        </div>
        {addButton}
      </div>

      <PaymentSummary
        recordedTotal={result.recordedTotal}
        budgetTotal={result.budgetTotal}
        projectPaidTotal={result.projectPaidTotal}
        remainingTotal={result.remainingTotal}
        selectedBalance={result.selectedBalance}
        projectBalances={result.projectBalances}
        currency={workspace.currency}
        showBudget={canManage}
      />
      <PaymentToolbar params={params} clients={clientOptions} projects={projectOptions} hideClientFilter={!canManage} />
      <PaymentList
        payments={result.payments}
        timeZone={workspace.timezone}
        canManage={canManage}
        clients={clientOptions}
        projects={projectOptions}
        invoices={invoiceOptions}
        currency={workspace.currency}
        defaultDate={todayKey}
        hasFilters={hasFilters}
        emptyAction={addButton ?? undefined}
      />
      <PaymentPagination params={params} page={result.page} pageCount={result.pageCount} total={result.total} />
    </div>
  );
}
