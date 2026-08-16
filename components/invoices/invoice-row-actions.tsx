"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { DeleteInvoiceDialog } from "@/components/invoices/delete-invoice-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cancelInvoiceAction, duplicateInvoiceAction, markInvoiceSentAction } from "@/lib/actions/invoices";
import type { InvoiceStatus } from "@/types/index";

export function InvoiceRowActions({
  invoiceId,
  invoiceNumber,
  status,
}: {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const canDelete = status === "draft";
  const canSend = status === "draft";
  const canCancel = status !== "paid" && status !== "cancelled";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${invoiceNumber}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/invoices/${invoiceId}`}>View</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => {
              startTransition(async () => {
                const result = await duplicateInvoiceAction(invoiceId);
                if (result?.error) {
                  toast.error(result.error);
                }
              });
            }}
          >
            Duplicate
          </DropdownMenuItem>
          {canSend ? (
            <DropdownMenuItem
              disabled={pending}
              onSelect={() => {
                startTransition(async () => {
                  const result = await markInvoiceSentAction(invoiceId);
                  if (result?.error) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Invoice marked as sent");
                });
              }}
            >
              Mark as sent
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                Delete draft
              </DropdownMenuItem>
            </>
          ) : canCancel ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setCancelOpen(true)}>
                Cancel invoice
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteInvoiceDialog
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel ${invoiceNumber}?`}
        description="Cancelled invoices stay in your records but cannot be edited or marked as paid."
        confirmLabel="Cancel invoice"
        pendingLabel="Cancelling…"
        onConfirm={async () => {
          const result = await cancelInvoiceAction(invoiceId);
          if (result?.error) {
            return result.error;
          }
          toast.success("Invoice cancelled");
        }}
      />
    </>
  );
}
