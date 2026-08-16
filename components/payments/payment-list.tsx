"use client";

import Link from "next/link";
import { MoreHorizontal, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { DeletePaymentDialog } from "@/components/payments/delete-payment-dialog";
import { paymentMethodLabels } from "@/components/payments/labels";
import {
  PaymentFormSheet,
  type PaymentFormClient,
  type PaymentFormInvoice,
  type PaymentFormProject,
  type PaymentFormValues,
} from "@/components/payments/payment-form-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PaymentListItem } from "@/lib/services/payments";
import { formatDate } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";

function toFormPayment(payment: PaymentListItem): PaymentFormValues & { id: string } {
  return {
    id: payment.id,
    clientId: payment.clientId,
    projectId: payment.projectId,
    invoiceId: payment.invoiceId,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    paymentDate: payment.paymentDate,
    reference: payment.reference,
    notes: payment.notes,
  };
}

export function PaymentList({
  payments,
  timeZone,
  canManage,
  clients,
  projects,
  invoices,
  currency,
  defaultDate,
  emptyAction,
  hasFilters,
}: {
  payments: PaymentListItem[];
  timeZone: string;
  canManage: boolean;
  clients: PaymentFormClient[];
  projects: PaymentFormProject[];
  invoices: PaymentFormInvoice[];
  currency: string;
  defaultDate: string;
  emptyAction?: ReactNode;
  hasFilters: boolean;
}) {
  if (payments.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<Wallet className="size-4" />}
            title={hasFilters ? "No matching payments" : "No payments yet"}
            description={
              hasFilters
                ? "Try a different search or filter."
                : "Record a payment manually. Card charges and Stripe come later."
            }
            action={hasFilters ? undefined : emptyAction}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {payments.map((payment) => (
          <Card key={payment.id} size="sm">
            <CardContent className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                {canManage ? (
                  <Link href={`/clients/${payment.clientId}`} className="block truncate font-medium hover:underline">
                    {payment.clientName}
                  </Link>
                ) : (
                  <p className="truncate font-medium">{payment.clientName}</p>
                )}
                <p className="truncate text-xs text-muted-foreground">
                  {payment.projectId ? (
                    <Link href={`/projects/${payment.projectId}`} className="hover:underline">
                      {payment.projectName ?? "Project"}
                    </Link>
                  ) : (
                    "No project"
                  )}
                  {payment.invoiceNumber ? ` · Invoice ${payment.invoiceNumber}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {paymentMethodLabels[payment.method]} · {formatDate(payment.paymentDate, timeZone)}
                </p>
                <p className="text-sm font-medium tabular-nums">
                  {formatMoney(payment.amount, payment.currency)}
                </p>
              </div>
              {canManage ? (
                <PaymentRowActions
                  payment={toFormPayment(payment)}
                  clients={clients}
                  projects={projects}
                  invoices={invoices}
                  currency={currency}
                  defaultDate={defaultDate}
                />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border md:block">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto_auto] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
          <p>Client / project</p>
          <p>Method</p>
          <p>Date</p>
          <p>Amount</p>
          <p className="text-right">Actions</p>
        </div>
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <div className="min-w-0 space-y-1">
              {canManage ? (
                <Link href={`/clients/${payment.clientId}`} className="truncate font-medium hover:underline">
                  {payment.clientName}
                </Link>
              ) : (
                <p className="truncate font-medium">{payment.clientName}</p>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {payment.projectId ? (
                  <Link href={`/projects/${payment.projectId}`} className="hover:underline">
                    {payment.projectName ?? "Project"}
                  </Link>
                ) : (
                  "No project"
                )}
                {payment.invoiceNumber ? ` · Invoice ${payment.invoiceNumber}` : ""}
                {payment.reference ? ` · ${payment.reference}` : ""}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{paymentMethodLabels[payment.method]}</p>
            <p className="text-xs text-muted-foreground">{formatDate(payment.paymentDate, timeZone)}</p>
            <p className="font-medium tabular-nums">{formatMoney(payment.amount, payment.currency)}</p>
            <div className="flex justify-end">
              {canManage ? (
                <PaymentRowActions
                  payment={toFormPayment(payment)}
                  clients={clients}
                  projects={projects}
                  invoices={invoices}
                  currency={currency}
                  defaultDate={defaultDate}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function PaymentRowActions({
  payment,
  clients,
  projects,
  invoices,
  currency,
  defaultDate,
}: {
  payment: PaymentFormValues & { id: string };
  clients: PaymentFormClient[];
  projects: PaymentFormProject[];
  invoices: PaymentFormInvoice[];
  currency: string;
  defaultDate: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Payment actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PaymentFormSheet
        payment={payment}
        clients={clients}
        projects={projects}
        invoices={invoices}
        currency={currency}
        defaultDate={defaultDate}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeletePaymentDialog
        paymentId={payment.id}
        amountLabel={formatMoney(payment.amount, payment.currency)}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
