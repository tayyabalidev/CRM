import { Badge } from "@/components/ui/badge";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { PaymentOverview } from "@/components/dashboard/payment-overview";
import { ProjectOverview } from "@/components/dashboard/project-overview";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RevenueSection } from "@/components/dashboard/revenue-section";
import { TodayTasks } from "@/components/dashboard/today-tasks";
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { requireWorkspace } from "@/lib/auth/workspace";
import { getDashboardData } from "@/lib/services/dashboard";
import { parseDashboardRange } from "@/lib/utils/dates";
import { isStaffRole } from "@/types/index";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const { workspace, profile, user } = await requireWorkspace();
  const range = parseDashboardRange(params.range);
  const data = await getDashboardData(workspace.id, range, workspace.timezone);
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const portal = !isStaffRole(workspace.role);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome, {firstName}</h1>
          <p className="text-sm text-muted-foreground">
            {portal
              ? `Your work with ${workspace.name}. You only see this client’s projects, invoices, and notes.`
              : `${workspace.name} overview. Figures update from your workspace data.`}
          </p>
        </div>
        <Badge variant="outline">{user.email}</Badge>
      </div>

      <DashboardStats
        totalRevenue={data.totalRevenue}
        outstanding={data.outstanding}
        activeProjects={data.activeProjects}
        pendingTasks={data.pendingTasks}
        currency={workspace.currency}
        portal={portal}
      />

      <RevenueSection data={data.revenueSeries} currency={workspace.currency} range={params.range} portal={portal} />

      <section className="grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ProjectOverview projects={data.projects} timeZone={workspace.timezone} />
        </div>
        <PaymentOverview
          paid={data.paid}
          pending={data.pending}
          overdue={data.overdue}
          currency={workspace.currency}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <TodayTasks tasks={data.todayTasks} timeZone={workspace.timezone} />
        <UpcomingDeadlines deadlines={data.deadlines} timeZone={workspace.timezone} />
      </section>

      <RecentActivity items={data.activity} timeZone={workspace.timezone} portal={portal} />
    </div>
  );
}
