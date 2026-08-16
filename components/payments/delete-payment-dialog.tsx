"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { deletePaymentAction } from "@/lib/actions/payments";

export function DeletePaymentDialog({
  paymentId,
  amountLabel,
  trigger,
  open,
  onOpenChange,
}: {
  paymentId: string;
  amountLabel: string;
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
          <DialogTitle>Delete {amountLabel}?</DialogTitle>
          <DialogDescription>
            This permanently removes the payment. Linked invoice balances update automatically. This cannot be undone.
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
                const result = await deletePaymentAction(paymentId);
                if (result?.error) {
                  setError(result.error);
                  return;
                }
                toast.success("Payment deleted");
                setDialogOpen(false);
              });
            }}
          >
            {pending ? "Deleting..." : "Delete payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
