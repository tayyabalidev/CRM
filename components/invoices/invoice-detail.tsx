"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { DeleteInvoiceDialog } from "@/components/invoices/delete-invoice-dialog";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import {
  InvoiceFormSheet,
  type InvoiceFormClient,
  type InvoiceFormProject,
} from "@/components/invoices/invoice-form-sheet";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { FileAttachmentList } from "@/components/files/file-attachment-list";
import { FileUploadSheet } from "@/components/files/file-upload-sheet";
import { EmptyState } from "@/components/dashboard/empty-state";
import { paymentMethodLabels } from "@/components/payments/labels";
import { PaymentFormSheet } from "@/components/payments/payment-form-sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cancelInvoiceAction, duplicateInvoiceAction, markInvoiceSentAction } from "@/lib/actions/invoices";
import { formatInvoiceMoney } from "@/lib/invoices/totals";
import type { InvoiceDetail } from "@/lib/services/invoices";
import { formatDate } from "@/lib/utils/dates";

export function InvoiceDetailView({
  detail,
  clients,
  projects,
  currency,
  timeZone,
  canManage,
  issuerName,
  issuerEmail,
  issuerPhone,
  defaultDate,
  defaultDueDate,
}: {
  detail: InvoiceDetail;
  clients: InvoiceFormClient[];
  projects: InvoiceFormProject[];
  currency: string;
  timeZone: string;
  canManage: boolean;
  issuerName: string;
  issuerEmail?: string | null;
  issuerPhone?: string | null;
  defaultDate: string;
  defaultDueDate: string;
}) {
  const [pending, startTransition] = useTransition();
  const formInvoice = {
    id: detail.id,
    clientId: detail.clientId,
    projectId: detail.projectId,
    issueDate: detail.issueDate,
    dueDate: detail.dueDate,
    discount: detail.discount,
    tax: detail.tax,
    notes: detail.notes,
    items: detail.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
  const canEdit = canManage && detail.status !== "paid" && detail.status !== "cancelled";
  const canSend = canManage && detail.status === "draft";
  const canPay =
    canManage && detail.status !== "draft" && detail.status !== "cancelled" && detail.status !== "paid";
  const canDelete = canManage && detail.status === "draft";
  const canCancel = canManage && detail.status !== "paid" && detail.status !== "cancelled";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{detail.invoiceNumber}</h1>
            <InvoiceStatusBadge value={detail.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {canManage ? (
              <Link href={`/clients/${detail.clientId}`} className="hover:underline">
                {detail.client.name}
              </Link>
            ) : (
              detail.client.name
            )}
            {detail.projectId ? (
              <>
                {" · "}
                <Link href={`/projects/${detail.projectId}`} className="hover:underline">
                  {detail.projectName}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/invoices/${detail.id}/print`}>Print</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/invoices/${detail.id}/pdf`}>Download PDF</a>
            </Button>
            {canPay ? (
              <PaymentFormSheet
                clients={clients}
                projects={projects}
                invoices={[
                  {
                    id: detail.id,
                    invoiceNumber: detail.invoiceNumber,
                    clientId: detail.clientId,
                    projectId: detail.projectId,
                  },
                ]}
                currency={currency}
                defaultDate={defaultDate}
                defaultClientId={detail.clientId}
                defaultProjectId={detail.projectId ?? undefined}
                defaultInvoiceId={detail.id}
                defaultAmount={detail.remaining > 0 ? String(detail.remaining) : ""}
                trigger={<Button>Record payment</Button>}
              />
            ) : null}
            {canSend ? (
              <Button
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await markInvoiceSentAction(detail.id);
                    if (result?.error) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Invoice marked as sent");
                  });
                }}
              >
                Mark as sent
              </Button>
            ) : null}
            {canEdit ? (
              <InvoiceFormSheet
                invoice={formInvoice}
                clients={clients}
                projects={projects}
                currency={currency}
                defaultIssueDate={defaultDate}
                defaultDueDate={defaultDueDate}
                trigger={<Button variant="outline">Edit</Button>}
              />
            ) : null}
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await duplicateInvoiceAction(detail.id);
                  if (result?.error) {
                    toast.error(result.error);
                  }
                });
              }}
            >
              Duplicate
            </Button>
            {canDelete ? (
              <DeleteInvoiceDialog invoiceId={detail.id} invoiceNumber={detail.invoiceNumber} trigger={<Button variant="destructive">Delete</Button>} />
            ) : canCancel ? (
              <ConfirmDialog
                title={`Cancel ${detail.invoiceNumber}?`}
                description="Cancelled invoices stay in your records but cannot be edited or marked as paid."
                confirmLabel="Cancel invoice"
                pendingLabel="Cancelling…"
                trigger={<Button variant="destructive">Cancel</Button>}
                onConfirm={async () => {
                  const result = await cancelInvoiceAction(detail.id);
                  if (result?.error) {
                    return result.error;
                  }
                  toast.success("Invoice cancelled");
                }}
              />
            ) : null}
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/invoices/${detail.id}/print`}>Print</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/invoices/${detail.id}/pdf`}>Download PDF</a>
            </Button>
          </div>
        )}
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{formatInvoiceMoney(detail.total, currency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Amount paid</CardDescription>
            <CardTitle className="text-2xl">{formatInvoiceMoney(detail.amountPaid, currency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Remaining</CardDescription>
            <CardTitle className="text-2xl">{formatInvoiceMoney(detail.remaining, currency)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardContent className="overflow-x-auto p-4 sm:p-6">
          <InvoiceDocument
            detail={detail}
            issuerName={issuerName}
            issuerEmail={issuerEmail}
            issuerPhone={issuerPhone}
            currency={currency}
            timeZone={timeZone}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>Money recorded against this invoice.</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.payments.length === 0 ? (
            <EmptyState
              compact
              title="No payments yet"
              description="Record a payment against this invoice when money comes in."
            />
          ) : (
            <ul className="divide-y">
              {detail.payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{formatInvoiceMoney(payment.amount, payment.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      {paymentMethodLabels[payment.method]} · {formatDate(payment.paymentDate, timeZone)}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>Private documents attached to this invoice.</CardDescription>
          {canManage ? (
            <CardAction>
              <FileUploadSheet
                workspaceId={detail.workspaceId}
                defaultClientId={detail.clientId}
                defaultProjectId={detail.projectId ?? undefined}
                defaultInvoiceId={detail.id}
                lockTargets
                trigger={<Button size="sm">Upload</Button>}
              />
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          {detail.files.length === 0 ? (
            <EmptyState
              compact
              title="No files yet"
              description="Attach contracts, receipts, or supporting documents."
            />
          ) : (
            <>
              <FileAttachmentList files={detail.files} canManage={canManage} />
              <p className="pt-3">
                <Link href={`/files?invoice=${detail.id}`} className="text-xs text-muted-foreground hover:underline">
                  View all files
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
