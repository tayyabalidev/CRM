"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { updateProfileSettingsAction } from "@/lib/actions/settings";
import { listTimezones } from "@/lib/constants/timezones";
import {
  profileSettingsSchema,
  type ProfileSettingsInput,
} from "@/lib/validations/settings";

export function ProfileSettingsForm({ defaults }: { defaults: ProfileSettingsInput }) {
  const timezones = useMemo(() => listTimezones(), []);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<ProfileSettingsInput>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: defaults,
  });

  return (
    <Card id="profile">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your name and contact details on this account.</CardDescription>
      </CardHeader>
      <form
        onSubmit={form.handleSubmit((values) => {
          setFormError(null);
          startTransition(async () => {
            const result = await updateProfileSettingsAction(values);
            if (result.error) {
              setFormError(result.error);
              return;
            }
            toast("Profile saved");
          });
        })}
      >
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Name</Label>
            <Input id="fullName" autoComplete="name" {...form.register("fullName")} />
            <FieldError message={form.formState.errors.fullName?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" autoComplete="tel" {...form.register("phone")} />
            <FieldError message={form.formState.errors.phone?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-timezone">Your timezone</Label>
            <Select id="profile-timezone" {...form.register("timezone")}>
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
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save profile"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
