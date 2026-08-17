import type { SupabaseClient } from "@supabase/supabase-js";

import { DEMO_PREFIX, demoLabel } from "@/lib/demo/constants";
import { invoiceTotals, lineTotal } from "@/lib/invoices/totals";
import { nextWorkspaceInvoiceNumber } from "@/lib/services/invoices";
import { syncInvoiceFromPayments } from "@/lib/services/payments";
import { addCalendarDays, zonedDateKey } from "@/lib/utils/dates";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

export type DemoSeedResult = {
  clients: number;
  projects: number;
  tasks: number;
  invoices: number;
  payments: number;
  timeEntries: number;
  notes: number;
};

export async function workspaceHasDemoData(supabase: Db, workspaceId: string) {
  const { count } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .like("name", `${DEMO_PREFIX}%`);

  return (count ?? 0) > 0;
}

export async function seedDemoData(
  supabase: Db,
  input: {
    workspaceId: string;
    userId: string;
    currency: string;
    timeZone: string;
  },
): Promise<DemoSeedResult | { error: string }> {
  const { workspaceId, userId, currency, timeZone } = input;

  if (await workspaceHasDemoData(supabase, workspaceId)) {
    return { error: "This workspace already has demo data. Clear it first." };
  }

  const today = zonedDateKey(new Date(), timeZone);

  const clients = [
    {
      name: demoLabel("Northwind Studio"),
      company: "Northwind Studio LLC",
      email: "hello@northwind.example",
      status: "active" as const,
      notes: "Primary design client. Demo only.",
    },
    {
      name: demoLabel("Bright Path Agency"),
      company: "Bright Path",
      email: "ops@brightpath.example",
      status: "active" as const,
      notes: "Retainer marketing work. Demo only.",
    },
    {
      name: demoLabel("Harbor Goods"),
      company: "Harbor Goods Co.",
      email: "finance@harbor.example",
      status: "inactive" as const,
      notes: "Paused for the season. Demo only.",
    },
  ];

  const { data: clientRows, error: clientError } = await supabase
    .from("clients")
    .insert(clients.map((client) => ({ ...client, workspace_id: workspaceId })))
    .select("id, name");

  if (clientError || !clientRows || clientRows.length !== clients.length) {
    return { error: "Could not create demo clients." };
  }

  const byName = Object.fromEntries(clientRows.map((row) => [row.name, row.id]));
  const northwindId = byName[demoLabel("Northwind Studio")];
  const brightId = byName[demoLabel("Bright Path Agency")];
  const harborId = byName[demoLabel("Harbor Goods")];

  if (!northwindId || !brightId || !harborId) {
    return { error: "Could not create demo clients." };
  }

  const projectDefs = [
    {
      client_id: northwindId,
      name: demoLabel("Brand refresh"),
      description: "Logo, colors, and site polish.",
      status: "active" as const,
      priority: "high" as const,
      budget: 4800,
      progress: 55,
      start_date: addCalendarDays(today, -45),
      due_date: addCalendarDays(today, 21),
    },
    {
      client_id: northwindId,
      name: demoLabel("Product landing page"),
      description: "Launch page for the spring collection.",
      status: "planning" as const,
      priority: "medium" as const,
      budget: 2200,
      progress: 10,
      start_date: today,
      due_date: addCalendarDays(today, 40),
    },
    {
      client_id: brightId,
      name: demoLabel("Monthly content retainer"),
      description: "Blog posts and social drafts.",
      status: "active" as const,
      priority: "medium" as const,
      budget: 1500,
      progress: 70,
      start_date: addCalendarDays(today, -60),
      due_date: addCalendarDays(today, 10),
    },
    {
      client_id: harborId,
      name: demoLabel("Storefront audit"),
      description: "UX review and backlog.",
      status: "on_hold" as const,
      priority: "low" as const,
      budget: 900,
      progress: 30,
      start_date: addCalendarDays(today, -90),
      due_date: addCalendarDays(today, -5),
    },
  ];

  const { data: projectRows, error: projectError } = await supabase
    .from("projects")
    .insert(
      projectDefs.map((project) => ({
        ...project,
        budget: project.budget.toFixed(2),
        workspace_id: workspaceId,
        currency,
      })),
    )
    .select("id, name");

  if (projectError || !projectRows || projectRows.length !== projectDefs.length) {
    await clearDemoData(supabase, workspaceId);
    return { error: "Could not create demo projects." };
  }

  const projectByName = Object.fromEntries(projectRows.map((row) => [row.name, row.id]));
  const brandId = projectByName[demoLabel("Brand refresh")];
  const landingId = projectByName[demoLabel("Product landing page")];
  const retainerId = projectByName[demoLabel("Monthly content retainer")];
  const auditId = projectByName[demoLabel("Storefront audit")];

  if (!brandId || !landingId || !retainerId || !auditId) {
    await clearDemoData(supabase, workspaceId);
    return { error: "Could not create demo projects." };
  }

  const taskDefs = [
    {
      title: demoLabel("Audit current brand assets"),
      project_id: brandId,
      client_id: northwindId,
      status: "completed" as const,
      priority: "high" as const,
      due_date: `${addCalendarDays(today, -10)}T17:00:00.000Z`,
      completed_at: `${addCalendarDays(today, -9)}T16:00:00.000Z`,
    },
    {
      title: demoLabel("Draft logo concepts"),
      project_id: brandId,
      client_id: northwindId,
      status: "in_progress" as const,
      priority: "high" as const,
      due_date: `${addCalendarDays(today, 3)}T17:00:00.000Z`,
    },
    {
      title: demoLabel("Client presentation deck"),
      project_id: brandId,
      client_id: northwindId,
      status: "todo" as const,
      priority: "medium" as const,
      due_date: `${addCalendarDays(today, 7)}T17:00:00.000Z`,
    },
    {
      title: demoLabel("Wireframe hero section"),
      project_id: landingId,
      client_id: northwindId,
      status: "todo" as const,
      priority: "medium" as const,
      due_date: `${addCalendarDays(today, 14)}T17:00:00.000Z`,
    },
    {
      title: demoLabel("Write April blog posts"),
      project_id: retainerId,
      client_id: brightId,
      status: "review" as const,
      priority: "medium" as const,
      due_date: `${addCalendarDays(today, 2)}T17:00:00.000Z`,
    },
    {
      title: demoLabel("Schedule social calendar"),
      project_id: retainerId,
      client_id: brightId,
      status: "in_progress" as const,
      priority: "low" as const,
      due_date: `${addCalendarDays(today, 5)}T17:00:00.000Z`,
    },
    {
      title: demoLabel("Checkout friction notes"),
      project_id: auditId,
      client_id: harborId,
      status: "backlog" as const,
      priority: "low" as const,
      due_date: `${addCalendarDays(today, 20)}T17:00:00.000Z`,
    },
    {
      title: demoLabel("Prioritize backlog"),
      project_id: auditId,
      client_id: harborId,
      status: "todo" as const,
      priority: "medium" as const,
      due_date: `${addCalendarDays(today, 12)}T17:00:00.000Z`,
    },
  ];

  const { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .insert(
      taskDefs.map((task) => ({
        ...task,
        workspace_id: workspaceId,
        assigned_to: userId,
      })),
    )
    .select("id");

  if (taskError || !taskRows || taskRows.length !== taskDefs.length) {
    await clearDemoData(supabase, workspaceId);
    return { error: "Could not create demo tasks." };
  }

  const invoicePlans = [
    {
      client_id: northwindId,
      project_id: brandId,
      status: "paid" as const,
      issue_date: addCalendarDays(today, -40),
      due_date: addCalendarDays(today, -25),
      notes: demoLabel("Brand refresh — deposit"),
      items: [
        { description: "Discovery workshop", quantity: 1, unitPrice: 600 },
        { description: "Moodboard package", quantity: 1, unitPrice: 400 },
      ],
      payments: [{ amount: 1000, daysAgo: 35, method: "bank_transfer" as const }],
    },
    {
      client_id: northwindId,
      project_id: brandId,
      status: "partially_paid" as const,
      issue_date: addCalendarDays(today, -12),
      due_date: addCalendarDays(today, 5),
      notes: demoLabel("Brand refresh — progress"),
      items: [
        { description: "Logo exploration (3 concepts)", quantity: 1, unitPrice: 1200 },
        { description: "Color system", quantity: 1, unitPrice: 500 },
      ],
      payments: [{ amount: 700, daysAgo: 8, method: "wise" as const }],
    },
    {
      client_id: brightId,
      project_id: retainerId,
      status: "sent" as const,
      issue_date: addCalendarDays(today, -5),
      due_date: addCalendarDays(today, 10),
      notes: demoLabel("April retainer"),
      items: [{ description: "Content retainer — April", quantity: 1, unitPrice: 1500 }],
      payments: [] as { amount: number; daysAgo: number; method: "bank_transfer" | "wise" | "paypal" }[],
    },
    {
      client_id: harborId,
      project_id: auditId,
      status: "draft" as const,
      issue_date: today,
      due_date: addCalendarDays(today, 14),
      notes: demoLabel("Storefront audit — draft"),
      items: [{ description: "UX audit (half day)", quantity: 1, unitPrice: 450 }],
      payments: [],
    },
  ];

  let invoiceCount = 0;
  let paymentCount = 0;

  for (const plan of invoicePlans) {
    const totals = invoiceTotals({
      items: plan.items,
      discount: 0,
      tax: 0,
    });
    const invoiceNumber = await nextWorkspaceInvoiceNumber(workspaceId);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        workspace_id: workspaceId,
        client_id: plan.client_id,
        project_id: plan.project_id,
        invoice_number: invoiceNumber,
        status: plan.status === "partially_paid" || plan.status === "paid" ? "sent" : plan.status,
        issue_date: plan.issue_date,
        due_date: plan.due_date,
        subtotal: totals.subtotal.toFixed(2),
        discount: "0.00",
        tax: "0.00",
        total: totals.total.toFixed(2),
        amount_paid: "0.00",
        notes: plan.notes,
      })
      .select("id")
      .maybeSingle();

    if (invoiceError || !invoice) {
      await clearDemoData(supabase, workspaceId);
      return { error: "Could not create demo invoices." };
    }

    invoiceCount += 1;

    const { error: itemsError } = await supabase.from("invoice_items").insert(
      plan.items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity.toFixed(2),
        unit_price: item.unitPrice.toFixed(2),
        total: lineTotal(item.quantity, item.unitPrice).toFixed(2),
      })),
    );

    if (itemsError) {
      await clearDemoData(supabase, workspaceId);
      return { error: "Could not create demo invoice lines." };
    }

    for (const payment of plan.payments) {
      const { error: paymentError } = await supabase.from("payments").insert({
        workspace_id: workspaceId,
        client_id: plan.client_id,
        project_id: plan.project_id,
        invoice_id: invoice.id,
        amount: payment.amount.toFixed(2),
        currency,
        payment_method: payment.method,
        payment_date: addCalendarDays(today, -payment.daysAgo),
        reference: demoLabel(`PAY-${invoiceNumber}`),
        notes: demoLabel("Seeded payment"),
        created_by: userId,
      });

      if (paymentError) {
        await clearDemoData(supabase, workspaceId);
        return { error: "Could not create demo payments." };
      }

      paymentCount += 1;
    }

    if (plan.payments.length > 0) {
      await syncInvoiceFromPayments(supabase, workspaceId, invoice.id, timeZone);
    }
  }

  const timeDefs = [
    {
      project_id: brandId,
      description: demoLabel("Logo sketching"),
      hoursAgoStart: 28,
      durationHours: 2.5,
      billable: true,
      rate: 85,
    },
    {
      project_id: brandId,
      description: demoLabel("Client call notes"),
      hoursAgoStart: 20,
      durationHours: 1,
      billable: true,
      rate: 85,
    },
    {
      project_id: retainerId,
      description: demoLabel("Blog drafting"),
      hoursAgoStart: 10,
      durationHours: 3,
      billable: true,
      rate: 75,
    },
    {
      project_id: auditId,
      description: demoLabel("Heuristic review"),
      hoursAgoStart: 72,
      durationHours: 2,
      billable: false,
      rate: null as number | null,
    },
  ];

  const nowMs = Date.now();
  const { error: timeError } = await supabase.from("time_entries").insert(
    timeDefs.map((entry) => {
      const started = new Date(nowMs - entry.hoursAgoStart * 3600_000);
      const ended = new Date(started.getTime() + entry.durationHours * 3600_000);
      return {
        workspace_id: workspaceId,
        project_id: entry.project_id,
        user_id: userId,
        description: entry.description,
        started_at: started.toISOString(),
        ended_at: ended.toISOString(),
        duration_seconds: Math.round(entry.durationHours * 3600),
        billable: entry.billable,
        hourly_rate: entry.rate == null ? null : entry.rate.toFixed(2),
      };
    }),
  );

  if (timeError) {
    await clearDemoData(supabase, workspaceId);
    return { error: "Could not create demo time entries." };
  }

  const noteDefs = [
    {
      title: demoLabel("Kickoff preferences"),
      content: "Prefers Slack for async updates. Demo only.",
      client_id: northwindId,
      project_id: brandId,
      visibility: "team" as const,
    },
    {
      title: demoLabel("Retainer scope reminder"),
      content: "4 posts + 8 social drafts per month. Demo only.",
      client_id: brightId,
      project_id: retainerId,
      visibility: "private" as const,
    },
    {
      title: demoLabel("Shared milestone notes"),
      content: "Landing page copy due next sprint. Demo only.",
      client_id: northwindId,
      project_id: landingId,
      visibility: "client" as const,
    },
  ];

  const { error: noteError } = await supabase.from("notes").insert(
    noteDefs.map((note) => ({
      ...note,
      workspace_id: workspaceId,
      created_by: userId,
    })),
  );

  if (noteError) {
    await clearDemoData(supabase, workspaceId);
    return { error: "Could not create demo notes." };
  }

  return {
    clients: clientRows.length,
    projects: projectRows.length,
    tasks: taskRows.length,
    invoices: invoiceCount,
    payments: paymentCount,
    timeEntries: timeDefs.length,
    notes: noteDefs.length,
  };
}

/** Removes all demo-tagged clients in the workspace (cascades related rows). */
export async function clearDemoData(supabase: Db, workspaceId: string) {
  const { data: demoClients, error: listError } = await supabase
    .from("clients")
    .select("id")
    .eq("workspace_id", workspaceId)
    .like("name", `${DEMO_PREFIX}%`);

  if (listError) {
    return { error: "Could not find demo data." as const };
  }

  const clientIds = (demoClients ?? []).map((row) => row.id);

  if (clientIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("clients")
      .delete()
      .eq("workspace_id", workspaceId)
      .in("id", clientIds);

    if (deleteError) {
      return { error: "Could not clear demo clients." as const };
    }
  }

  // Sweep any leftover tagged rows (should be rare if cascades worked).
  await Promise.all([
    supabase
      .from("projects")
      .delete()
      .eq("workspace_id", workspaceId)
      .like("name", `${DEMO_PREFIX}%`),
    supabase
      .from("tasks")
      .delete()
      .eq("workspace_id", workspaceId)
      .like("title", `${DEMO_PREFIX}%`),
    supabase
      .from("notes")
      .delete()
      .eq("workspace_id", workspaceId)
      .like("title", `${DEMO_PREFIX}%`),
    supabase
      .from("time_entries")
      .delete()
      .eq("workspace_id", workspaceId)
      .like("description", `${DEMO_PREFIX}%`),
    supabase
      .from("payments")
      .delete()
      .eq("workspace_id", workspaceId)
      .like("notes", `${DEMO_PREFIX}%`),
    supabase
      .from("invoices")
      .delete()
      .eq("workspace_id", workspaceId)
      .like("notes", `${DEMO_PREFIX}%`),
  ]);

  return { cleared: true as const };
}
