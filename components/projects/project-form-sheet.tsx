"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { ReactNode } from "react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import {
  ScreenshotDraftList,
  collectScreenshotDrafts,
  saveScreenshotDrafts,
  type ScreenshotDraft,
  type ScreenshotDraftListHandle,
} from "@/components/screenshots/screenshot-draft-list";
import { currencies } from "@/lib/constants/currencies";
import { addProjectAction, updateProjectAction } from "@/lib/actions/projects";
import { type ProjectInput, projectSchema } from "@/lib/validations/project";
import { priorities, projectStatuses, type Priority, type ProjectStatus } from "@/types/index";
import { priorityLabels, projectStatusLabels } from "@/components/dashboard/status-badge";

export type ProjectFormClient = {
  id: string;
  name: string;
};

export type ProjectFormValues = {
  id?: string;
  name: string;
  clientId: string;
  description: string | null;
  budget: string | number | null;
  currency: string;
  startDate: string | null;
  dueDate: string | null;
  priority: Priority;
  status: ProjectStatus;
  progress: number | null;
};

function toDefaults(project: ProjectFormValues | undefined, defaultCurrency: string): ProjectInput {
  return {
    name: project?.name ?? "",
    clientId: project?.clientId ?? "",
    description: project?.description ?? "",
    budget: project?.budget == null || project.budget === "" ? "" : String(project.budget),
    currency: project?.currency ?? defaultCurrency,
    startDate: project?.startDate ?? "",
    dueDate: project?.dueDate ?? "",
    priority: project?.priority ?? "medium",
    status: project?.status ?? "planning",
    manualProgress: project?.progress != null,
    progress: project?.progress == null ? "0" : String(project.progress),
  };
}

export function ProjectFormSheet({
  project,
  clients,
  defaultCurrency,
  trigger,
  open,
  onOpenChange,
}: {
  project?: ProjectFormValues;
  clients: ProjectFormClient[];
  defaultCurrency: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(project?.id);
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [manualProgress, setManualProgress] = useState(Boolean(project?.progress != null));
  const [screenshotDrafts, setScreenshotDrafts] = useState<ScreenshotDraft[]>([]);
  const screenshotListRef = useRef<ScreenshotDraftListHandle>(null);
  const sheetOpen = open ?? uncontrolledOpen;
  const setSheetOpen = onOpenChange ?? setUncontrolledOpen;
  const form = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: toDefaults(project, defaultCurrency),
  });

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(next) => {
        setSheetOpen(next);
        if (next) {
          form.reset(toDefaults(project, defaultCurrency));
          setManualProgress(Boolean(project?.progress != null));
          setScreenshotDrafts([]);
          setFormError(null);
        }
      }}
    >
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit project" : "Add project"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update scope, dates, budget, and progress." : "Create a project for a client."}
          </SheetDescription>
        </SheetHeader>
        {clients.length === 0 ? (
          <div className="space-y-3 px-4">
            <p className="text-sm text-muted-foreground">
              Add a client first. Projects must belong to a client.
            </p>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Close
              </Button>
              <Button asChild>
                <Link href="/clients">Go to clients</Link>
              </Button>
            </SheetFooter>
          </div>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit((values) => {
              setFormError(null);
              const drafts = collectScreenshotDrafts(screenshotDrafts, screenshotListRef.current);
              if ("error" in drafts) {
                setFormError(drafts.error);
                return;
              }

              startTransition(async () => {
                if (isEdit && project?.id) {
                  const result = await updateProjectAction(project.id, values);
                  if (result?.error) {
                    setFormError(result.error);
                    return;
                  }

                  if (drafts.length > 0) {
                    const uploaded = await saveScreenshotDrafts({
                      drafts,
                      projectId: project.id,
                      clientId: project.clientId,
                    });
                    if (uploaded.error) {
                      setFormError(uploaded.error);
                      return;
                    }
                  }

                  toast.success("Project saved");
                  setSheetOpen(false);
                  return;
                }

                const result = await addProjectAction(values);
                if (!result || "error" in result) {
                  setFormError(result?.error ?? "Could not add this project. Try again.");
                  return;
                }

                if (drafts.length > 0) {
                  const uploaded = await saveScreenshotDrafts({
                    drafts,
                    projectId: result.id,
                    clientId: result.clientId,
                  });
                  if (uploaded.error) {
                    setFormError(uploaded.error);
                    router.push(`/projects/${result.id}`);
                    return;
                  }
                }

                toast.success("Project added");
                router.push(`/projects/${result.id}`);
              });
            })}
          >
            <div className="flex-1 space-y-3 overflow-y-auto px-4">
              <div className="space-y-1.5">
                <Label htmlFor="project-name">Name</Label>
                <Input id="project-name" {...form.register("name")} />
                <FieldError message={form.formState.errors.name?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="project-client">Client</Label>
                <Select id="project-client" {...form.register("clientId")}>
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
                <Label htmlFor="project-description">Description</Label>
                <Textarea id="project-description" rows={3} {...form.register("description")} />
                <FieldError message={form.formState.errors.description?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>Screenshots</Label>
                <p className="text-xs text-muted-foreground">
                  Add a short note and a picture for each change. Stack as many as you need.
                </p>
                <ScreenshotDraftList
                  ref={screenshotListRef}
                  items={screenshotDrafts}
                  onChange={setScreenshotDrafts}
                  disabled={pending}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="project-budget">Budget</Label>
                  <Input id="project-budget" inputMode="decimal" {...form.register("budget")} />
                  <FieldError message={form.formState.errors.budget?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="project-currency">Currency</Label>
                  <Select id="project-currency" {...form.register("currency")}>
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} · {currency.label}
                      </option>
                    ))}
                  </Select>
                  <FieldError message={form.formState.errors.currency?.message} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="project-start">Start date</Label>
                  <Input id="project-start" type="date" {...form.register("startDate")} />
                  <FieldError message={form.formState.errors.startDate?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="project-due">Due date</Label>
                  <Input id="project-due" type="date" {...form.register("dueDate")} />
                  <FieldError message={form.formState.errors.dueDate?.message} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="project-priority">Priority</Label>
                  <Select id="project-priority" {...form.register("priority")}>
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priorityLabels[priority]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="project-status">Status</Label>
                  <Select id="project-status" {...form.register("status")}>
                    {projectStatuses.map((status) => (
                      <option key={status} value={status}>
                        {projectStatusLabels[status]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border"
                  {...form.register("manualProgress", {
                    onChange: (event) => setManualProgress(event.target.checked),
                  })}
                />
                Set progress manually
              </label>
              {manualProgress ? (
                <div className="space-y-1.5">
                  <Label htmlFor="project-progress">Progress (%)</Label>
                  <Input id="project-progress" inputMode="numeric" {...form.register("progress")} />
                  <FieldError message={form.formState.errors.progress?.message} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Progress is calculated from completed tasks until you override it.
                </p>
              )}
              {formError ? <FieldError message={formError} /> : null}
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : isEdit ? "Save changes" : "Add project"}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
