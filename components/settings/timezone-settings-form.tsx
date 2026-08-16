"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { updateTimezoneSettingsAction } from "@/lib/actions/settings";
import { listTimezones } from "@/lib/constants/timezones";
import {
  timezoneSettingsSchema,
  type TimezoneSettingsInput,
} from "@/lib/validations/settings";

export function TimezoneSettingsForm({
  defaults,
  canManage,
}: {
  defaults: TimezoneSettingsInput;
  canManage: boolean;
}) {
  const timezones = useMemo(() => listTimezones(), []);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<TimezoneSettingsInput>({
    resolver: zodResolver(timezoneSettingsSchema),
    defaultValues: defaults,
  });

  return (
    <Card id="timezone">
      <CardHeader>
        <CardTitle>Timezone</CardTitle>
        <CardDescription>Used for due dates, invoices, and the dashboard in this workspace.</CardDescription>
      </CardHeader>
      <form
        onSubmit={form.handleSubmit((values) => {
          setFormError(null);
          startTransition(async () => {
            const result = await updateTimezoneSettingsAction(values);
            if (result.error) {
              setFormError(result.error);
              return;
            }
            toast("Timezone saved");
          });
        })}
      >
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="workspace-timezone">Workspace timezone</Label>
            <Select id="workspace-timezone" disabled={!canManage} {...form.register("timezone")}>
              {timezones.includes(defaults.timezone) ? null : (
                <option value={defaults.timezone}>{defaults.timezone}</option>
              )}
              {timezones.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </Select>
            <FieldError message={form.formState.errors.timezone?.message} />
          </div>
          <FieldError message={formError ?? undefined} />
        </CardContent>
        {canManage ? (
          <CardFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save timezone"}
            </Button>
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}
