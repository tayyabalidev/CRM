"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspace } from "@/lib/auth/workspace";
import { logActivity, logInvoicePaidIfNeeded } from "@/lib/services/activity";
import { notifyPaymentRecorded } from "@/lib/services/notifications";
import { syncInvoiceFromPayments } from "@/lib/services/payments";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/ids";
import { formatMoney } from "@/lib/utils/money";
import { emptyToNull } from "@/lib/utils/text";
import { paymentSchema } from "@/lib/validations/payment";
import { isStaffRole } from "@/types/index";

function revalidatePayments(input?: {
  clientId?: string | null;
  projectId?: string | null;
  invoiceId?: string | null;
}) {
  revalidatePath("/");
  revalidatePath("/payments");
  revalidatePath("/clients");
  revalidatePath("/projects");
  revalidatePath("/invoices");

  if (input?.clientId) {
    revalidatePath(`/clients/${input.clientId}`);
  }

  if (input?.projectId) {
    revalidatePath(`/projects/${input.projectId}`);
  }

  if (input?.invoiceId) {
    revalidatePath(`/invoices/${input.invoiceId}`);
  }
}

async function resolvePaymentTargets(
  workspaceId: string,
  input: { clientId: string; projectId: string | null; invoiceId: string | null },
) {
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", input.clientId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!client) {
    return { error: "Choose a client from this workspace." as const };
  }

  let projectId: string | null = input.projectId;
  const invoiceId: string | null = input.invoiceId;

  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id, client_id")
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!project || project.client_id !== client.id) {
      return { error: "Choose a project that belongs to this client." as const };
    }
  }

  if (invoiceId) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, client_id, project_id, status")
      .eq("id", invoiceId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!invoice || invoice.client_id !== client.id) {
      return { error: "Choose an invoice that belongs to this client." as const };
    }

    if (invoice.status === "cancelled") {
      return { error: "Cancelled invoices cannot receive payments." as const };
    }

    if (projectId && invoice.project_id && invoice.project_id !== projectId) {
      return { error: "Choose an invoice that matches the selected project." as const };
    }

    if (!projectId && invoice.project_id) {
      projectId = invoice.project_id;
    }
  }

  return { client, projectId, invoiceId };
}

export async function addPaymentAction(input: unknown) {
  const parsed = paymentSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to record payments." };
  }

  const projectId = emptyToNull(parsed.data.projectId);
  const invoiceId = emptyToNull(parsed.data.invoiceId);
  const targets = await resolvePaymentTargets(workspace.id, {
    clientId: parsed.data.clientId,
    projectId,
    invoiceId,
  });

  if ("error" in targets) {
    return { error: targets.error };
  }

  const amount = Number(parsed.data.amount).toFixed(2);
  const currency = parsed.data.currency.toUpperCase();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .insert({
      workspace_id: workspace.id,
      client_id: targets.client.id,
      project_id: targets.projectId,
      invoice_id: targets.invoiceId,
      amount,
      currency,
      payment_method: parsed.data.paymentMethod,
      payment_date: parsed.data.paymentDate,
      reference: emptyToNull(parsed.data.reference),
      notes: emptyToNull(parsed.data.notes),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not record this payment. Try again." };
  }

  if (targets.invoiceId) {
    const synced = await syncInvoiceFromPayments(supabase, workspace.id, targets.invoiceId, workspace.timezone);
    if (synced) {
      await logInvoicePaidIfNeeded(supabase, {
        workspaceId: workspace.id,
        userId: user.id,
        invoiceId: synced.id,
        invoiceNumber: synced.invoiceNumber,
        previousStatus: synced.previousStatus,
        nextStatus: synced.status,
      });
    }
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "payment",
    entityId: data.id,
    action: "created",
    message: `recorded a payment of ${formatMoney(Number(amount), currency)} for ${targets.client.name}.`,
  });

  await notifyPaymentRecorded(supabase, {
    workspaceId: workspace.id,
    actorId: user.id,
    paymentId: data.id,
    amountLabel: formatMoney(Number(amount), currency),
    clientName: targets.client.name,
    clientId: targets.client.id,
  });

  revalidatePayments({
    clientId: targets.client.id,
    projectId: targets.projectId,
    invoiceId: targets.invoiceId,
  });
  return {};
}

export async function updatePaymentAction(paymentId: string, input: unknown) {
  if (!isUuid(paymentId)) {
    return { error: "Payment not found." };
  }

  const parsed = paymentSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { workspace, user } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to edit payments." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("payments")
    .select("id, client_id, project_id, invoice_id")
    .eq("id", paymentId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Payment not found." };
  }

  const projectId = emptyToNull(parsed.data.projectId);
  const invoiceId = emptyToNull(parsed.data.invoiceId);
  const targets = await resolvePaymentTargets(workspace.id, {
    clientId: parsed.data.clientId,
    projectId,
    invoiceId,
  });

  if ("error" in targets) {
    return { error: targets.error };
  }

  const amount = Number(parsed.data.amount).toFixed(2);
  const currency = parsed.data.currency.toUpperCase();
  const { error } = await supabase
    .from("payments")
    .update({
      client_id: targets.client.id,
      project_id: targets.projectId,
      invoice_id: targets.invoiceId,
      amount,
      currency,
      payment_method: parsed.data.paymentMethod,
      payment_date: parsed.data.paymentDate,
      reference: emptyToNull(parsed.data.reference),
      notes: emptyToNull(parsed.data.notes),
    })
    .eq("id", paymentId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not update this payment. Try again." };
  }

  const invoiceIds = new Set([existing.invoice_id, targets.invoiceId].filter(Boolean) as string[]);
  for (const id of invoiceIds) {
    const synced = await syncInvoiceFromPayments(supabase, workspace.id, id, workspace.timezone);
    if (synced) {
      await logInvoicePaidIfNeeded(supabase, {
        workspaceId: workspace.id,
        userId: user.id,
        invoiceId: synced.id,
        invoiceNumber: synced.invoiceNumber,
        previousStatus: synced.previousStatus,
        nextStatus: synced.status,
      });
    }
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    entityType: "payment",
    entityId: paymentId,
    action: "updated",
    message: `updated a payment of ${formatMoney(Number(amount), currency)} for ${targets.client.name}.`,
  });

  revalidatePayments({
    clientId: targets.client.id,
    projectId: targets.projectId,
    invoiceId: targets.invoiceId,
  });
  revalidatePayments({
    clientId: existing.client_id,
    projectId: existing.project_id,
    invoiceId: existing.invoice_id,
  });
  return {};
}

export async function deletePaymentAction(paymentId: string) {
  if (!isUuid(paymentId)) {
    return { error: "Payment not found." };
  }

  const { workspace } = await requireWorkspace();

  if (!isStaffRole(workspace.role)) {
    return { error: "You do not have permission to delete payments." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("payments")
    .select("id, client_id, project_id, invoice_id")
    .eq("id", paymentId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Payment not found." };
  }

  const { error } = await supabase.from("payments").delete().eq("id", paymentId).eq("workspace_id", workspace.id);

  if (error) {
    return { error: "Could not delete this payment. Try again." };
  }

  if (existing.invoice_id) {
    await syncInvoiceFromPayments(supabase, workspace.id, existing.invoice_id, workspace.timezone);
  }

  revalidatePayments({
    clientId: existing.client_id,
    projectId: existing.project_id,
    invoiceId: existing.invoice_id,
  });
  return {};
}
