"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { updateNotificationSettingsAction } from "@/lib/actions/settings";
import {
  notificationSettingsSchema,
  type NotificationSettingsInput,
} from "@/lib/validations/settings";

export function NotificationSettingsForm({ defaults }: { defaults: NotificationSettingsInput }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<NotificationSettingsInput>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: defaults,
  });

  return (
    <Card id="notifications">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choose how you want to be notified. Email delivery is saved for later and is not sent yet.
        </CardDescription>
      </CardHeader>
      <form
        onSubmit={form.handleSubmit((values) => {
          setFormError(null);
          startTransition(async () => {
            const result = await updateNotificationSettingsAction(values);
            if (result.error) {
              setFormError(result.error);
              return;
            }
            toast("Notification preferences saved");
          });
        })}
      >
        <CardContent className="space-y-3">
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-foreground" {...form.register("notifyInApp")} />
            <span>
              <span className="font-medium">In-app</span>
              <span className="mt-0.5 block text-muted-foreground">Show alerts in the notification bell.</span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-foreground" {...form.register("notifyEmail")} />
            <span>
              <span className="font-medium">Email</span>
              <span className="mt-0.5 block text-muted-foreground">
                Stored on your profile. No email provider is connected yet.
              </span>
            </span>
          </label>
          <FieldError message={formError ?? undefined} />
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save notifications"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
