"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { paymentMethodLabels } from "@/components/payments/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { addPaymentAction, updatePaymentAction } from "@/lib/actions/payments";
import { paymentSchema, type PaymentInput } from "@/lib/validations/payment";
import { paymentMethods, type PaymentMethod } from "@/types/index";

export type PaymentFormClient = { id: string; name: string };
export type PaymentFormProject = { id: string; name: string; clientId: string };
export type PaymentFormInvoice = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  projectId: string | null;
};

export type PaymentFormValues = {
  id?: string;
  clientId: string;
  projectId: string | null;
  invoiceId: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
};

function toDefaults(
  payment: PaymentFormValues | undefined,
  defaults: {
    clientId?: string;
    projectId?: string;
    invoiceId?: string;
    amount?: string;
    currency: string;
    paymentDate: string;
  },
): PaymentInput {
  return {
    clientId: payment?.clientId ?? defaults.clientId ?? "",
    projectId: payment?.projectId ?? defaults.projectId ?? "",
    invoiceId: payment?.invoiceId ?? defaults.invoiceId ?? "",
    amount: payment ? String(payment.amount) : (defaults.amount ?? ""),
    currency: payment?.currency ?? defaults.currency,
    paymentMethod: payment?.method ?? "bank_transfer",
    paymentDate: payment?.paymentDate ?? defaults.paymentDate,
    reference: payment?.reference ?? "",
    notes: payment?.notes ?? "",
  };
}

export function PaymentFormSheet({
  payment,
  clients,
  projects,
  invoices,
  currency,
  defaultDate,
  defaultClientId,
  defaultProjectId,
  defaultInvoiceId,
  defaultAmount,
  trigger,
  open,
  onOpenChange,
}: {
  payment?: PaymentFormValues;
  clients: PaymentFormClient[];
  projects: PaymentFormProject[];
  invoices: PaymentFormInvoice[];
  currency: string;
  defaultDate: string;
  defaultClientId?: string;
  defaultProjectId?: string;
  defaultInvoiceId?: string;
  defaultAmount?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(payment?.id);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sheetOpen = open ?? uncontrolledOpen;
  const setSheetOpen = onOpenChange ?? setUncontrolledOpen;
  const initial = toDefaults(payment, {
    clientId: defaultClientId,
    projectId: defaultProjectId,
    invoiceId: defaultInvoiceId,
    amount: defaultAmount,
    currency,
    paymentDate: defaultDate,
  });
  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: initial,
  });
  const [clientId, setClientId] = useState(initial.clientId);
  const [projectId, setProjectId] = useState(initial.projectId);
  const visibleProjects = projects.filter((project) => !clientId || project.clientId === clientId);
  const visibleInvoices = invoices.filter((invoice) => {
    if (clientId && invoice.clientId !== clientId) {
      return false;
    }

    if (projectId && invoice.projectId && invoice.projectId !== projectId) {
      return false;
    }

    return true;
  });

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(next) => {
        setSheetOpen(next);
        if (next) {
          const nextDefaults = toDefaults(payment, {
            clientId: defaultClientId,
            projectId: defaultProjectId,
            invoiceId: defaultInvoiceId,
            amount: defaultAmount,
            currency,
            paymentDate: defaultDate,
          });
          form.reset(nextDefaults);
          setClientId(nextDefaults.clientId);
          setProjectId(nextDefaults.projectId);
          setFormError(null);
        }
      }}
    >
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit payment" : "Record payment"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the recorded amount, method, or allocation."
              : "Record a payment manually. This does not charge a card or bank account."}
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit((values) => {
            setFormError(null);
            startTransition(async () => {
              const result =
                isEdit && payment?.id
                  ? await updatePaymentAction(payment.id, values)
                  : await addPaymentAction(values);

              if (result?.error) {
                setFormError(result.error);
                return;
              }

              toast.success(isEdit ? "Payment saved" : "Payment recorded");
              setSheetOpen(false);
            });
          })}
        >
          <div className="flex-1 space-y-3 overflow-y-auto px-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment-client">Client</Label>
              <Select
                id="payment-client"
                {...form.register("clientId", {
                  onChange: (event) => {
                    setClientId(event.target.value);
                    setProjectId("");
                    form.setValue("projectId", "");
                    form.setValue("invoiceId", "");
                  },
                })}
              >
                <option value="">Choose a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.clientId?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-project">Project</Label>
              <Select
                id="payment-project"
                disabled={!clientId}
                {...form.register("projectId", {
                  onChange: (event) => {
                    setProjectId(event.target.value);
                    form.setValue("invoiceId", "");
                  },
                })}
              >
                <option value="">No project</option>
                {visibleProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
            {visibleInvoices.length > 0 || defaultInvoiceId ? (
              <div className="space-y-1.5">
                <Label htmlFor="payment-invoice">Invoice</Label>
                <Select id="payment-invoice" disabled={!clientId} {...form.register("invoiceId")}>
                  <option value="">No invoice</option>
                  {visibleInvoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="payment-amount">Amount</Label>
                <Input id="payment-amount" inputMode="decimal" {...form.register("amount")} />
                <FieldError message={form.formState.errors.amount?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-currency">Currency</Label>
                <Input id="payment-currency" maxLength={3} {...form.register("currency")} />
                <FieldError message={form.formState.errors.currency?.message} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="payment-date">Date</Label>
                <Input id="payment-date" type="date" {...form.register("paymentDate")} />
                <FieldError message={form.formState.errors.paymentDate?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-method">Method</Label>
                <Select id="payment-method" {...form.register("paymentMethod")}>
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {paymentMethodLabels[method]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-reference">Reference</Label>
              <Input id="payment-reference" placeholder="Transaction ID or note" {...form.register("reference")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-notes">Notes</Label>
              <Textarea id="payment-notes" rows={3} {...form.register("notes")} />
            </div>
            {formError ? <FieldError message={formError} /> : null}
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save changes" : "Record payment"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
