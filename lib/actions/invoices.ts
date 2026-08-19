"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspace } from "@/lib/auth/workspace";
import { invoiceTotals, lineTotal, remainingBalance } from "@/lib/invoices/totals";
import { logActivity, logInvoicePaidIfNeeded } from "@/lib/services/activity";
import { nextWorkspaceInvoiceNumber } from "@/lib/services/invoices";
import { notifyClientPortalUsers } from "@/lib/services/notifications";
import { createClient } from "@/lib/supabase/server";
import { addCalendarDays, zonedDateKey } from "@/lib/utils/dates";
import { isUuid } from "@/lib/utils/ids";
import { toNumber } from "@/lib/utils/money";
import { emptyToNull } from "@/lib/utils/text";
import { invoiceSchema } from "@/lib/validations/invoice";
import { isStaffRole, type InvoiceStatus } from "@/types/index";

function revalidateInvoices(input?: {
  invoiceId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
}) {
  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/clients");
  revalidatePath("/projects");

  if (input?.invoiceId) {
    revalidatePath(`/invoices/${input.invoiceId}`);
    revalidatePath(`/invoices/${input.invoiceId}/print`);
  }

  if (input?.clientId) {
    revalidatePath(`/clients/${input.clientId}`);
  }

  if (input?.projectId) {
    revalidatePath(`/projects/${input.projectId}`);
  }
}

function money(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : 0;
}

async function resolveInvoiceTargets(workspaceId: string, clientId: string, projectId: string | null) {
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!client) {
    return { error: "Choose a client from this workspace." as const };
  }

  if (!projectId) {
    return { client, projectId: null };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, client_id")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!project || project.client_id !== client.id) {
    return { error: "Choose a project that belongs to this client." as const };
  }

  return { client, projectId: project.id };
}

function preparedItems(items: { description: string; quantity: string; unitPrice: string }[]) {
  return items.map((item) => {
    const quantity = money(item.quantity);
    const unitPrice = money(item.unitPrice);
    return {
      description: item.description.trim(),
      quantity: quantity.toFixed(2),
      unit_price: unitPrice.toFixed(2),
      total: lineTotal(quantity, unitPrice).toFixed(2),
    };
  });
}

export async function addInvoiceAction(input: unknown) {
  const parsed = invoiceSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to create invoices." };
  }

  const projectId = emptyToNull(parsed.data.projectId);
  const targets = await resolveInvoiceTargets(workspace.id, parsed.data.clientId, projectId);

  if ("error" in targets) {
    return { error: targets.error };
  }

  const items = preparedItems(parsed.data.items);
  const totals = invoiceTotals({
    items: parsed.data.items.map((item) => ({ quantity: money(item.quantity), unitPrice: money(item.unitPrice) })),
    discount: money(parsed.data.discount),
    tax: money(parsed.data.tax),
  });
  const invoiceNumber = await nextWorkspaceInvoiceNumber(workspace.id);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      workspace_id: workspace.id,
      client_id: targets.client.id,
      project_id: targets.projectId,
      invoice_number: invoiceNumber,
      issue_date: parsed.data.issueDate,
      due_date: emptyToNull(parsed.data.dueDate),
      subtotal: totals.subtotal.toFixed(2),
      discount: totals.discount.toFixed(2),
      tax: totals.tax.toFixed(2),
      total: totals.total.toFixed(2),
      amount_paid: "0.00",
      status: "draft",
      notes: emptyToNull(parsed.data.notes),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not create this invoice. Try again." };
  }

  const { error: itemsError } = await supabase.from("invoice_items").insert(
    items.map((item) => ({
      invoice_id: data.id,
      ...item,
    })),
  );

  if (itemsError) {
    await supabase.from("invoices").delete().eq("id", data.id).eq("workspace_id", workspace.id);
    return { error: "Could not save invoice line items. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "invoice",
    entityId: data.id,
    action: "created",
    message: `created invoice ${invoiceNumber} for ${targets.client.name}.`,
  });

  revalidateInvoices({ invoiceId: data.id, clientId: targets.client.id, projectId: targets.projectId });
  redirect(`/invoices/${data.id}`);
}

export async function updateInvoiceAction(invoiceId: string, input: unknown) {
  if (!isUuid(invoiceId)) {
    return { error: "Invoice not found." };
  }

  const parsed = invoiceSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to edit invoices." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("invoices")
    .select("id, client_id, project_id, status, amount_paid, invoice_number")
    .eq("id", invoiceId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Invoice not found." };
  }

  if (existing.status === "paid" || existing.status === "cancelled") {
    return { error: "Paid and cancelled invoices cannot be edited." };
  }

  const projectId = emptyToNull(parsed.data.projectId);
  const targets = await resolveInvoiceTargets(workspace.id, parsed.data.clientId, projectId);

  if ("error" in targets) {
    return { error: targets.error };
  }

  const items = preparedItems(parsed.data.items);
  const totals = invoiceTotals({
    items: parsed.data.items.map((item) => ({ quantity: money(item.quantity), unitPrice: money(item.unitPrice) })),
    discount: money(parsed.data.discount),
    tax: money(parsed.data.tax),
  });
  const amountPaid = toNumber(existing.amount_paid);
  let status: InvoiceStatus = existing.status;

  if (status !== "draft") {
    if (totals.total > 0 && amountPaid >= totals.total) {
      status = "paid";
    } else if (amountPaid > 0) {
      status = "partially_paid";
    } else {
      const today = zonedDateKey(new Date(), workspace.timezone);
      status = parsed.data.dueDate && parsed.data.dueDate < today ? "overdue" : "sent";
    }
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      client_id: targets.client.id,
      project_id: targets.projectId,
      issue_date: parsed.data.issueDate,
      due_date: emptyToNull(parsed.data.dueDate),
      subtotal: totals.subtotal.toFixed(2),
      discount: totals.discount.toFixed(2),
      tax: totals.tax.toFixed(2),
      total: totals.total.toFixed(2),
      status,
      notes: emptyToNull(parsed.data.notes),
    })
    .eq("id", invoiceId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not update this invoice. Try again." };
  }

  await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
  const { error: itemsError } = await supabase.from("invoice_items").insert(
    items.map((item) => ({
      invoice_id: invoiceId,
      ...item,
    })),
  );

  if (itemsError) {
    return { error: "Could not save invoice line items. Try again." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "invoice",
    entityId: invoiceId,
    action: "updated",
    message: `updated an invoice for ${targets.client.name}.`,
  });
  await logInvoicePaidIfNeeded(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    invoiceId,
    invoiceNumber: existing.invoice_number,
    previousStatus: existing.status,
    nextStatus: status,
  });

  revalidateInvoices({ invoiceId, clientId: targets.client.id, projectId: targets.projectId });
  revalidateInvoices({ clientId: existing.client_id, projectId: existing.project_id });
  return {};
}

export async function duplicateInvoiceAction(invoiceId: string) {
  if (!isUuid(invoiceId)) {
    return { error: "Invoice not found." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to duplicate invoices." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("invoices")
    .select("id, client_id, project_id, issue_date, due_date, subtotal, discount, tax, total, notes, clients ( name )")
    .eq("id", invoiceId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Invoice not found." };
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("description, quantity, unit_price, total")
    .eq("invoice_id", invoiceId);

  const today = zonedDateKey(new Date(), workspace.timezone);
  const invoiceNumber = await nextWorkspaceInvoiceNumber(workspace.id);
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      workspace_id: workspace.id,
      client_id: existing.client_id,
      project_id: existing.project_id,
      invoice_number: invoiceNumber,
      issue_date: today,
      due_date: existing.due_date ? addCalendarDays(today, 14) : null,
      subtotal: existing.subtotal,
      discount: existing.discount,
      tax: existing.tax,
      total: existing.total,
      amount_paid: "0.00",
      status: "draft",
      notes: existing.notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not duplicate this invoice. Try again." };
  }

  if (items && items.length > 0) {
    await supabase.from("invoice_items").insert(
      items.map((item) => ({
        invoice_id: data.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      })),
    );
  }

  const client = Array.isArray(existing.clients) ? existing.clients[0] : existing.clients;

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "invoice",
    entityId: data.id,
    action: "created",
    message: `duplicated invoice ${invoiceNumber}${client?.name ? ` for ${client.name}` : ""}.`,
  });

  revalidateInvoices({ invoiceId: data.id, clientId: existing.client_id, projectId: existing.project_id });
  redirect(`/invoices/${data.id}`);
}

export async function markInvoiceSentAction(invoiceId: string) {
  if (!isUuid(invoiceId)) {
    return { error: "Invoice not found." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to send invoices." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("invoices")
    .select("id, status, due_date, total, amount_paid, invoice_number, client_id, project_id")
    .eq("id", invoiceId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Invoice not found." };
  }

  if (existing.status !== "draft") {
    return { error: "Only draft invoices can be marked as sent." };
  }

  const today = zonedDateKey(new Date(), workspace.timezone);
  const remaining = remainingBalance(toNumber(existing.total), toNumber(existing.amount_paid));
  const status =
    remaining <= 0 ? "paid" : existing.due_date && existing.due_date < today ? "overdue" : "sent";

  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", invoiceId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not mark this invoice as sent." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "invoice",
    entityId: invoiceId,
    action: "sent",
    message: `marked invoice ${existing.invoice_number} as sent.`,
  });
  await notifyClientPortalUsers(supabase, {
    workspaceId: workspace.id,
    clientId: existing.client_id,
    actorId: user.id,
    title: "New invoice",
    message: `${existing.invoice_number} is ready to view.`,
    type: "invoice_sent",
    link: `/invoices/${invoiceId}`,
    entityType: "invoice",
    entityId: invoiceId,
  });
  await logInvoicePaidIfNeeded(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    invoiceId,
    invoiceNumber: existing.invoice_number,
    previousStatus: existing.status,
    nextStatus: status,
  });

  revalidateInvoices({
    invoiceId,
    clientId: existing.client_id,
    projectId: existing.project_id,
  });
  return {};
}

export async function cancelInvoiceAction(invoiceId: string) {
  if (!isUuid(invoiceId)) {
    return { error: "Invoice not found." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to cancel invoices." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("invoices")
    .select("id, status, invoice_number, client_id, project_id")
    .eq("id", invoiceId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Invoice not found." };
  }

  if (existing.status === "paid") {
    return { error: "Paid invoices cannot be cancelled." };
  }

  if (existing.status === "cancelled") {
    return { error: "This invoice is already cancelled." };
  }

  const { error } = await supabase
    .from("invoices")
    .update({ status: "cancelled" })
    .eq("id", invoiceId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not cancel this invoice." };
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "invoice",
    entityId: invoiceId,
    action: "cancelled",
    message: `cancelled invoice ${existing.invoice_number}.`,
  });

  revalidateInvoices({
    invoiceId,
    clientId: existing.client_id,
    projectId: existing.project_id,
  });
  return {};
}

export async function deleteInvoiceAction(invoiceId: string) {
  if (!isUuid(invoiceId)) {
    return { error: "Invoice not found." };
  }

  const { workspace } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to delete invoices." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("invoices")
    .select("id, status, client_id, project_id")
    .eq("id", invoiceId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Invoice not found." };
  }

  if (existing.status !== "draft") {
    return { error: "Only draft invoices can be deleted." };
  }

  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId).eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not delete this invoice." };
  }

  revalidateInvoices({ clientId: existing.client_id, projectId: existing.project_id });
  redirect("/invoices");
}
