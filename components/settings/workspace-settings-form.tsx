"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateWorkspaceSettingsAction } from "@/lib/actions/settings";
import {
  workspaceSettingsSchema,
  type WorkspaceSettingsInput,
} from "@/lib/validations/settings";

export function WorkspaceSettingsForm({
  defaults,
  canManage,
}: {
  defaults: WorkspaceSettingsInput;
  canManage: boolean;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<WorkspaceSettingsInput>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: defaults,
  });

  return (
    <Card id="workspace">
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
        <CardDescription>Name and logo for this workspace.</CardDescription>
      </CardHeader>
      <form
        onSubmit={form.handleSubmit((values) => {
          setFormError(null);
          startTransition(async () => {
            const result = await updateWorkspaceSettingsAction(values);
            if (result.error) {
              setFormError(result.error);
              return;
            }
            toast("Workspace saved");
          });
        })}
      >
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="workspace-name">Name</Label>
            <Input id="workspace-name" disabled={!canManage} {...form.register("name")} />
            <FieldError message={form.formState.errors.name?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workspace-logo">Logo URL</Label>
            <Input
              id="workspace-logo"
              placeholder="https://"
              disabled={!canManage}
              {...form.register("logoUrl")}
            />
            <FieldError message={form.formState.errors.logoUrl?.message} />
          </div>
          {defaults.logoUrl ? (
            <Image
              src={defaults.logoUrl}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="size-12 rounded-lg border object-cover"
            />
          ) : null}
          <FieldError message={formError ?? undefined} />
        </CardContent>
        {canManage ? (
          <CardFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save workspace"}
            </Button>
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}
