"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { addTimeEntryAction, listTaskOptionsAction, updateTimeEntryAction } from "@/lib/actions/time";
import { toDateTimeLocalValue } from "@/lib/utils/dates";
import { timeEntrySchema, type TimeEntryInput } from "@/lib/validations/time";

export type TimeEntryFormValues = {
  id?: string;
  projectId: string;
  taskId: string | null;
  description: string | null;
  startedAt: string;
  endedAt: string | null;
  billable: boolean;
  hourlyRate: number | null;
};

function toDefaults(entry?: TimeEntryFormValues, defaultProjectId?: string): TimeEntryInput {
  return {
    projectId: entry?.projectId ?? defaultProjectId ?? "",
    taskId: entry?.taskId ?? "",
    description: entry?.description ?? "",
    startedAt: toDateTimeLocalValue(entry?.startedAt),
    endedAt: toDateTimeLocalValue(entry?.endedAt),
    billable: entry?.billable ?? true,
    hourlyRate: entry?.hourlyRate == null ? "" : String(entry.hourlyRate),
  };
}

export function TimeEntryFormSheet({
  entry,
  projects,
  defaultProjectId,
  trigger,
  open,
  onOpenChange,
}: {
  entry?: TimeEntryFormValues;
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(entry?.id);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [taskState, setTaskState] = useState<{ projectId: string; tasks: { id: string; title: string }[] }>({
    projectId: "",
    tasks: [],
  });
  const [pending, startTransition] = useTransition();
  const sheetOpen = open ?? uncontrolledOpen;
  const setSheetOpen = onOpenChange ?? setUncontrolledOpen;
  const form = useForm<TimeEntryInput>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: toDefaults(entry, defaultProjectId),
  });
  const [projectId, setProjectId] = useState(entry?.projectId ?? defaultProjectId ?? "");
  const tasks = taskState.projectId === projectId ? taskState.tasks : [];

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let active = true;

    listTaskOptionsAction(projectId, entry?.taskId ?? undefined).then((rows) => {
      if (active) {
        setTaskState({
          projectId,
          tasks: rows.map((row) => ({ id: row.id, title: row.title })),
        });
      }
    });

    return () => {
      active = false;
    };
  }, [entry?.taskId, projectId]);

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(next) => {
        setSheetOpen(next);
        if (next) {
          const defaults = toDefaults(entry, defaultProjectId);
          form.reset(defaults);
          setProjectId(defaults.projectId);
          setFormError(null);
        }
      }}
    >
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit time entry" : "Add time entry"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update the recorded hours." : "Manually record time against a project."}
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit((values) => {
            setFormError(null);
            startTransition(async () => {
              const result =
                isEdit && entry?.id
                  ? await updateTimeEntryAction(entry.id, values)
                  : await addTimeEntryAction(values);

              if (result?.error) {
                setFormError(result.error);
                return;
              }

              toast.success(isEdit ? "Time entry saved" : "Time entry added");
              setSheetOpen(false);
            });
          })}
        >
          <div className="flex-1 space-y-3 overflow-y-auto px-4">
            <div className="space-y-1.5">
              <Label htmlFor="entry-project">Project</Label>
              <Select
                id="entry-project"
                {...form.register("projectId", {
                  onChange: (event) => {
                    setProjectId(event.target.value);
                    form.setValue("taskId", "");
                  },
                })}
              >
                <option value="">Choose a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.projectId?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-task">Task</Label>
              <Select id="entry-task" disabled={!projectId} {...form.register("taskId")}>
                <option value="">No task</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-description">Description</Label>
              <Input id="entry-description" {...form.register("description")} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="entry-start">Start</Label>
                <Input id="entry-start" type="datetime-local" {...form.register("startedAt")} />
                <FieldError message={form.formState.errors.startedAt?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="entry-end">End</Label>
                <Input id="entry-end" type="datetime-local" {...form.register("endedAt")} />
                <FieldError message={form.formState.errors.endedAt?.message} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-rate">Hourly rate</Label>
              <Input id="entry-rate" inputMode="decimal" placeholder="Optional" {...form.register("hourlyRate")} />
              <FieldError message={form.formState.errors.hourlyRate?.message} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 rounded border" {...form.register("billable")} />
              Billable
            </label>
            {formError ? <FieldError message={formError} /> : null}
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save changes" : "Add entry"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
