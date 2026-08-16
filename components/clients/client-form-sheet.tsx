"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { addClientAction, updateClientAction } from "@/lib/actions/clients";
import { type ClientInput, clientSchema } from "@/lib/validations/client";
import { clientStatuses, type ClientStatus } from "@/types/index";

type ClientFormValues = {
  id?: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  country: string | null;
  notes: string | null;
  status: ClientStatus;
};

function toDefaults(client?: ClientFormValues): ClientInput {
  return {
    name: client?.name ?? "",
    company: client?.company ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    website: client?.website ?? "",
    address: client?.address ?? "",
    country: client?.country ?? "",
    notes: client?.notes ?? "",
    status: client?.status ?? "active",
  };
}

export function ClientFormSheet({
  client,
  trigger,
  open,
  onOpenChange,
}: {
  client?: ClientFormValues;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(client?.id);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sheetOpen = open ?? uncontrolledOpen;
  const setSheetOpen = onOpenChange ?? setUncontrolledOpen;

  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: toDefaults(client),
  });

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(next) => {
        setSheetOpen(next);
        if (next) {
          form.reset(toDefaults(client));
          setFormError(null);
        }
      }}
    >
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        side="right"
      >
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit client" : "Add client"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update contact details and status for this client."
              : "Add a company or person you work with."}
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit((values) => {
            setFormError(null);
            startTransition(async () => {
              const result = isEdit && client?.id
                ? await updateClientAction(client.id, values)
                : await addClientAction(values);

              if (result?.error) {
                setFormError(result.error);
                return;
              }

              if (isEdit) {
                toast.success("Client saved");
                setSheetOpen(false);
              }
            });
          })}
        >
          <div className="flex-1 space-y-3 overflow-y-auto px-4">
            <div className="space-y-1.5">
              <Label htmlFor="client-name">Name</Label>
              <Input
                id="client-name"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-company">Company</Label>
              <Input
                id="client-company"
                aria-invalid={Boolean(form.formState.errors.company)}
                {...form.register("company")}
              />
              <FieldError message={form.formState.errors.company?.message} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  aria-invalid={Boolean(form.formState.errors.email)}
                  {...form.register("email")}
                />
                <FieldError message={form.formState.errors.email?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-phone">Phone</Label>
                <Input
                  id="client-phone"
                  aria-invalid={Boolean(form.formState.errors.phone)}
                  {...form.register("phone")}
                />
                <FieldError message={form.formState.errors.phone?.message} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="client-website">Website</Label>
                <Input
                  id="client-website"
                  placeholder="https://"
                  aria-invalid={Boolean(form.formState.errors.website)}
                  {...form.register("website")}
                />
                <FieldError message={form.formState.errors.website?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-country">Country</Label>
                <Input
                  id="client-country"
                  aria-invalid={Boolean(form.formState.errors.country)}
                  {...form.register("country")}
                />
                <FieldError message={form.formState.errors.country?.message} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-address">Address</Label>
              <Textarea
                id="client-address"
                rows={2}
                aria-invalid={Boolean(form.formState.errors.address)}
                {...form.register("address")}
              />
              <FieldError message={form.formState.errors.address?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-status">Status</Label>
              <Select
                id="client-status"
                aria-invalid={Boolean(form.formState.errors.status)}
                {...form.register("status")}
              >
                {clientStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.status?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-notes">Notes</Label>
              <Textarea
                id="client-notes"
                rows={4}
                aria-invalid={Boolean(form.formState.errors.notes)}
                {...form.register("notes")}
              />
              <FieldError message={form.formState.errors.notes?.message} />
            </div>
            {formError ? <FieldError message={formError} /> : null}
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save changes" : "Add client"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
