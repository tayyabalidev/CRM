"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
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
import { addInvoiceAction, updateInvoiceAction } from "@/lib/actions/invoices";
import { formatInvoiceMoney, invoiceTotals, lineTotal } from "@/lib/invoices/totals";
import { invoiceSchema, type InvoiceInput } from "@/lib/validations/invoice";

export type InvoiceFormClient = { id: string; name: string };
export type InvoiceFormProject = { id: string; name: string; clientId: string };

export type InvoiceFormItem = {
  description: string;
  quantity: string;
  unitPrice: string;
};

export type InvoiceFormValues = {
  id?: string;
  clientId: string;
  projectId: string | null;
  issueDate: string;
  dueDate: string | null;
  discount: number;
  tax: number;
  notes: string | null;
  items: { description: string; quantity: number; unitPrice: number }[];
};

function emptyItem(): InvoiceFormItem {
  return { description: "", quantity: "1", unitPrice: "" };
}

function toDefaults(
  invoice: InvoiceFormValues | undefined,
  defaults: { clientId?: string; projectId?: string; issueDate: string; dueDate: string },
): InvoiceInput {
  return {
    clientId: invoice?.clientId ?? defaults.clientId ?? "",
    projectId: invoice?.projectId ?? defaults.projectId ?? "",
    issueDate: invoice?.issueDate ?? defaults.issueDate,
    dueDate: invoice?.dueDate ?? defaults.dueDate,
    discount: invoice ? String(invoice.discount) : "",
    tax: invoice ? String(invoice.tax) : "",
    notes: invoice?.notes ?? "",
    items:
      invoice?.items.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
      })) ?? [emptyItem()],
  };
}

export function InvoiceFormSheet({
  invoice,
  clients,
  projects,
  currency,
  defaultIssueDate,
  defaultDueDate,
  defaultClientId,
  defaultProjectId,
  trigger,
  open,
  onOpenChange,
}: {
  invoice?: InvoiceFormValues;
  clients: InvoiceFormClient[];
  projects: InvoiceFormProject[];
  currency: string;
  defaultIssueDate: string;
  defaultDueDate: string;
  defaultClientId?: string;
  defaultProjectId?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(invoice?.id);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sheetOpen = open ?? uncontrolledOpen;
  const setSheetOpen = onOpenChange ?? setUncontrolledOpen;
  const initial = toDefaults(invoice, {
    clientId: defaultClientId,
    projectId: defaultProjectId,
    issueDate: defaultIssueDate,
    dueDate: defaultDueDate,
  });
  const form = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: initial,
  });
  const [clientId, setClientId] = useState(initial.clientId);
  const [items, setItems] = useState<InvoiceFormItem[]>(initial.items);
  const [discount, setDiscount] = useState(initial.discount);
  const [tax, setTax] = useState(initial.tax);
  const visibleProjects = projects.filter((project) => !clientId || project.clientId === clientId);
  const discountAmount = Number(discount || 0);
  const taxAmount = Number(tax || 0);
  const totals = invoiceTotals({
    items: items.map((item) => ({ quantity: Number(item.quantity) || 0, unitPrice: Number(item.unitPrice) || 0 })),
    discount: Number.isFinite(discountAmount) ? discountAmount : 0,
    tax: Number.isFinite(taxAmount) ? taxAmount : 0,
  });

  function updateItems(next: InvoiceFormItem[]) {
    setItems(next);
    form.setValue("items", next, { shouldValidate: true });
  }

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(next) => {
        setSheetOpen(next);
        if (next) {
          const nextDefaults = toDefaults(invoice, {
            clientId: defaultClientId,
            projectId: defaultProjectId,
            issueDate: defaultIssueDate,
            dueDate: defaultDueDate,
          });
          form.reset(nextDefaults);
          setClientId(nextDefaults.clientId);
          setItems(nextDefaults.items);
          setDiscount(nextDefaults.discount);
          setTax(nextDefaults.tax);
          setFormError(null);
        }
      }}
    >
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl" side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit invoice" : "Create invoice"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update client, dates, and line items." : "Invoice numbers are assigned automatically."}
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit((values) => {
            setFormError(null);
            startTransition(async () => {
              const payload = { ...values, items };
              const result =
                isEdit && invoice?.id
                  ? await updateInvoiceAction(invoice.id, payload)
                  : await addInvoiceAction(payload);

              if (result?.error) {
                setFormError(result.error);
                return;
              }

              toast.success(isEdit ? "Invoice saved" : "Invoice created");
              setSheetOpen(false);
            });
          })}
        >
          <div className="flex-1 space-y-3 overflow-y-auto px-4">
            <div className="space-y-1.5">
              <Label htmlFor="invoice-client">Client</Label>
              <Select
                id="invoice-client"
                {...form.register("clientId", {
                  onChange: (event) => {
                    setClientId(event.target.value);
                    form.setValue("projectId", "");
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
              <Label htmlFor="invoice-project">Project</Label>
              <Select id="invoice-project" disabled={!clientId} {...form.register("projectId")}>
                <option value="">No project</option>
                {visibleProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="invoice-issue">Issue date</Label>
                <Input id="invoice-issue" type="date" {...form.register("issueDate")} />
                <FieldError message={form.formState.errors.issueDate?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invoice-due">Due date</Label>
                <Input id="invoice-due" type="date" {...form.register("dueDate")} />
                <FieldError message={form.formState.errors.dueDate?.message} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateItems([...items, emptyItem()])}
                >
                  <Plus /> Add item
                </Button>
              </div>
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_4.5rem_6rem_auto]">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(event) => {
                      const value = event.target.value;
                      updateItems(items.map((row, rowIndex) => (rowIndex === index ? { ...row, description: value } : row)));
                    }}
                  />
                  <Input
                    inputMode="decimal"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(event) => {
                      const value = event.target.value;
                      updateItems(items.map((row, rowIndex) => (rowIndex === index ? { ...row, quantity: value } : row)));
                    }}
                  />
                  <Input
                    inputMode="decimal"
                    placeholder="Price"
                    value={item.unitPrice}
                    onChange={(event) => {
                      const value = event.target.value;
                      updateItems(items.map((row, rowIndex) => (rowIndex === index ? { ...row, unitPrice: value } : row)));
                    }}
                  />
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatInvoiceMoney(lineTotal(Number(item.quantity) || 0, Number(item.unitPrice) || 0), currency)}
                    </span>
                    {items.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove item"
                        onClick={() => updateItems(items.filter((_, rowIndex) => rowIndex !== index))}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              <FieldError message={form.formState.errors.items?.message ?? form.formState.errors.items?.root?.message} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="invoice-discount">Discount amount</Label>
                <Input
                  id="invoice-discount"
                  inputMode="decimal"
                  placeholder="0.00"
                  {...form.register("discount", {
                    onChange: (event) => setDiscount(event.target.value),
                  })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invoice-tax">Tax amount</Label>
                <Input
                  id="invoice-tax"
                  inputMode="decimal"
                  placeholder="0.00"
                  {...form.register("tax", {
                    onChange: (event) => setTax(event.target.value),
                  })}
                />
              </div>
            </div>

            <div className="space-y-1 rounded-lg border px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatInvoiceMoney(totals.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatInvoiceMoney(totals.total, currency)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invoice-notes">Notes</Label>
              <Textarea id="invoice-notes" rows={3} {...form.register("notes")} />
            </div>
            {formError ? <FieldError message={formError} /> : null}
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save changes" : "Create invoice"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
