"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteInvoiceAction } from "@/lib/actions/invoices";

export function DeleteInvoiceDialog({
  invoiceId,
  invoiceNumber,
  trigger,
  open,
  onOpenChange,
}: {
  invoiceId: string;
  invoiceNumber: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogOpen = open ?? uncontrolledOpen;
  const setDialogOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(next) => {
        setDialogOpen(next);
        if (next) {
          setError(null);
        }
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {invoiceNumber}?</DialogTitle>
          <DialogDescription>
            This permanently deletes the draft invoice and its line items. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error ? <FieldError message={error} /> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await deleteInvoiceAction(invoiceId);
                if (result?.error) {
                  setError(result.error);
                }
              });
            }}
          >
            {pending ? "Deleting..." : "Delete draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
