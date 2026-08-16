import { PageHeader } from "@/components/layout/page-header";
import { RangeToggle } from "@/components/dashboard/range-toggle";
import { ReportsHours } from "@/components/reports/reports-hours";
import { ReportsProjectProfitability } from "@/components/reports/reports-project-profitability";
import { ReportsRevenueByClient } from "@/components/reports/reports-revenue-by-client";
import { ReportsRevenueByMonth } from "@/components/reports/reports-revenue-by-month";
import { ReportsStats } from "@/components/reports/reports-stats";
import { requireStaff } from "@/lib/auth/workspace";
import { getReportsData } from "@/lib/services/reports";
import { parseDashboardRange, rangeLabel } from "@/lib/utils/dates";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const { workspace } = await requireStaff();
  const range = parseDashboardRange(params.range);
  const data = await getReportsData(workspace.id, range, workspace.timezone);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Reports"
        description={`Revenue, invoices, hours, and project profitability for the last ${rangeLabel(range)}.`}
        actions={<RangeToggle value={params.range} basePath="/reports" />}
      />

      <ReportsStats
        totalRevenue={data.totalRevenue}
        outstanding={data.outstanding}
        paidInvoiceCount={data.paidInvoiceCount}
        paidInvoiceAmount={data.paidInvoiceAmount}
        overdueInvoiceCount={data.overdueInvoiceCount}
        overdueAmount={data.overdueAmount}
        currency={workspace.currency}
      />

      <ReportsHours trackedSeconds={data.trackedSeconds} billableSeconds={data.billableSeconds} />

      <section className="grid gap-3 xl:grid-cols-2">
        <ReportsRevenueByMonth data={data.revenueByMonth} currency={workspace.currency} range={range} />
        <ReportsRevenueByClient data={data.revenueByClient} currency={workspace.currency} range={range} />
      </section>

      <ReportsProjectProfitability rows={data.projectProfitability} currency={workspace.currency} />
    </div>
  );
}
