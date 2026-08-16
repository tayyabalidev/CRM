"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { InvoiceRowActions } from "@/components/invoices/invoice-row-actions";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatInvoiceMoney } from "@/lib/invoices/totals";
import type { InvoiceListItem } from "@/lib/services/invoices";
import { formatDate } from "@/lib/utils/dates";

export function InvoiceList({
  invoices,
  timeZone,
  currency,
  canManage,
  emptyAction,
  hasFilters,
}: {
  invoices: InvoiceListItem[];
  timeZone: string;
  currency: string;
  canManage: boolean;
  emptyAction?: ReactNode;
  hasFilters: boolean;
}) {
  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<FileText className="size-4" />}
            title={hasFilters ? "No matching invoices" : "No invoices yet"}
            description={
              hasFilters
                ? "Try a different search or filter."
                : canManage
                  ? "Create an invoice with line items, then mark it as sent."
                  : "Invoices sent to you will appear here."
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
        {invoices.map((invoice) => (
          <Card key={invoice.id} size="sm">
            <CardContent className="flex items-start justify-between gap-3">
              <Link href={`/invoices/${invoice.id}`} className="min-w-0 space-y-1.5">
                <p className="truncate font-medium">{invoice.invoiceNumber}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {invoice.clientName}
                  {invoice.projectName ? ` · ${invoice.projectName}` : ""}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <InvoiceStatusBadge value={invoice.status} />
                  <span className="text-xs text-muted-foreground">
                    {invoice.dueDate ? formatDate(invoice.dueDate, timeZone) : "No due date"}
                  </span>
                </div>
                <p className="text-sm font-medium tabular-nums">
                  {formatInvoiceMoney(invoice.total, currency)}
                </p>
              </Link>
              {canManage ? (
                <InvoiceRowActions
                  invoiceId={invoice.id}
                  invoiceNumber={invoice.invoiceNumber}
                  status={invoice.status}
                />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border md:block">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto_auto] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
          <p>Invoice</p>
          <p>Client</p>
          <p>Status</p>
          <p>Due</p>
          <p>Amount</p>
          <p className="text-right">Actions</p>
        </div>
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <div className="min-w-0">
              <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                {invoice.invoiceNumber}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {invoice.projectName ?? "No project"}
              </p>
            </div>
            {canManage ? (
              <Link href={`/clients/${invoice.clientId}`} className="truncate text-sm hover:underline">
                {invoice.clientName}
              </Link>
            ) : (
              <p className="truncate text-sm">{invoice.clientName}</p>
            )}
            <InvoiceStatusBadge value={invoice.status} />
            <p className="text-xs text-muted-foreground">
              {invoice.dueDate ? formatDate(invoice.dueDate, timeZone) : "No due date"}
            </p>
            <div>
              <p className="font-medium tabular-nums">{formatInvoiceMoney(invoice.total, currency)}</p>
              {invoice.remaining > 0 && invoice.status !== "draft" && invoice.status !== "cancelled" ? (
                <p className="text-xs text-muted-foreground">
                  {formatInvoiceMoney(invoice.remaining, currency)} due
                </p>
              ) : null}
            </div>
            <div className="flex justify-end">
              {canManage ? (
                <InvoiceRowActions
                  invoiceId={invoice.id}
                  invoiceNumber={invoice.invoiceNumber}
                  status={invoice.status}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
