"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { updateCurrencySettingsAction } from "@/lib/actions/settings";
import { currencies } from "@/lib/constants/currencies";
import {
  currencySettingsSchema,
  type CurrencySettingsInput,
} from "@/lib/validations/settings";

export function CurrencySettingsForm({
  defaults,
  canManage,
}: {
  defaults: CurrencySettingsInput;
  canManage: boolean;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<CurrencySettingsInput>({
    resolver: zodResolver(currencySettingsSchema),
    defaultValues: defaults,
  });

  return (
    <Card id="currency">
      <CardHeader>
        <CardTitle>Currency</CardTitle>
        <CardDescription>
          Default for new invoices and payments. Existing records keep their own currency.
        </CardDescription>
      </CardHeader>
      <form
        onSubmit={form.handleSubmit((values) => {
          setFormError(null);
          startTransition(async () => {
            const result = await updateCurrencySettingsAction(values);
            if (result.error) {
              setFormError(result.error);
              return;
            }
            toast("Currency saved");
          });
        })}
      >
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="workspace-currency">Default currency</Label>
            <Select id="workspace-currency" disabled={!canManage} {...form.register("currency")}>
              {currencies.some((currency) => currency.code === defaults.currency) ? null : (
                <option value={defaults.currency}>{defaults.currency}</option>
              )}
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} — {currency.label}
                </option>
              ))}
            </Select>
            <FieldError message={form.formState.errors.currency?.message} />
          </div>
          <FieldError message={formError ?? undefined} />
        </CardContent>
        {canManage ? (
          <CardFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save currency"}
            </Button>
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}
