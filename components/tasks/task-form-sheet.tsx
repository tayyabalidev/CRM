"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { priorityLabels, taskStatusLabels } from "@/components/dashboard/status-badge";
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
import { addTaskAction, updateTaskAction } from "@/lib/actions/tasks";
import { toDateTimeLocalValue } from "@/lib/utils/dates";
import { type TaskInput, taskSchema } from "@/lib/validations/task";
import { priorities, taskStatuses, type Priority, type TaskStatus } from "@/types/index";

export type TaskFormProject = { id: string; name: string };
export type TaskFormAssignee = { id: string; name: string };

export type TaskFormValues = {
  id?: string;
  title: string;
  description: string | null;
  projectId: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  priority: Priority;
  status: TaskStatus;
  estimatedMinutes: number | null;
};

function hoursFromMinutes(minutes: number | null | undefined) {
  if (minutes == null) {
    return "";
  }

  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : String(Math.round(hours * 100) / 100);
}

function toDefaults(task: TaskFormValues | undefined, defaultProjectId?: string): TaskInput {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    projectId: task?.projectId ?? defaultProjectId ?? "",
    assigneeId: task?.assigneeId ?? "",
    dueDate: toDateTimeLocalValue(task?.dueDate),
    priority: task?.priority ?? "medium",
    status: task?.status ?? "todo",
    estimatedHours: hoursFromMinutes(task?.estimatedMinutes),
  };
}

export function TaskFormSheet({
  task,
  projects,
  assignees,
  defaultProjectId,
  trigger,
  open,
  onOpenChange,
}: {
  task?: TaskFormValues;
  projects: TaskFormProject[];
  assignees: TaskFormAssignee[];
  defaultProjectId?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(task?.id);
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [screenshotDrafts, setScreenshotDrafts] = useState<ScreenshotDraft[]>([]);
  const screenshotListRef = useRef<ScreenshotDraftListHandle>(null);
  const sheetOpen = open ?? uncontrolledOpen;
  const setSheetOpen = onOpenChange ?? setUncontrolledOpen;
  const form = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: toDefaults(task, defaultProjectId),
  });

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(next) => {
        setSheetOpen(next);
        if (next) {
          form.reset(toDefaults(task, defaultProjectId));
          setScreenshotDrafts([]);
          setFormError(null);
        }
      }}
    >
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit task" : "Add task"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update details, assignee, and status." : "Create a task and optionally attach it to a project."}
          </SheetDescription>
        </SheetHeader>
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
              if (isEdit && task?.id) {
                const result = await updateTaskAction(task.id, values);
                if (result?.error) {
                  setFormError(result.error);
                  return;
                }

                if (drafts.length > 0) {
                  const uploaded = await saveScreenshotDrafts({
                    drafts,
                    taskId: task.id,
                    projectId: values.projectId || task.projectId,
                  });
                  if (uploaded.error) {
                    setFormError(uploaded.error);
                    return;
                  }
                }

                toast.success("Task saved");
                setSheetOpen(false);
                return;
              }

              const result = await addTaskAction(values);
              if (!result || "error" in result) {
                setFormError(result?.error ?? "Could not add this task. Try again.");
                return;
              }

              if (drafts.length > 0) {
                const uploaded = await saveScreenshotDrafts({
                  drafts,
                  taskId: result.id,
                  projectId: result.projectId,
                  clientId: result.clientId,
                });
                if (uploaded.error) {
                  setFormError(uploaded.error);
                  router.push(`/tasks/${result.id}`);
                  return;
                }
              }

              toast.success("Task added");
              router.push(`/tasks/${result.id}`);
            });
          })}
        >
          <div className="flex-1 space-y-3 overflow-y-auto px-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" {...form.register("title")} />
              <FieldError message={form.formState.errors.title?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-description">Description</Label>
              <Textarea id="task-description" rows={4} {...form.register("description")} />
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
            <div className="space-y-1.5">
              <Label htmlFor="task-project">Project</Label>
              <Select id="task-project" {...form.register("projectId")}>
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.projectId?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Select id="task-assignee" {...form.register("assigneeId")}>
                <option value="">Unassigned</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="task-due">Due date</Label>
                <Input id="task-due" type="datetime-local" {...form.register("dueDate")} />
                <FieldError message={form.formState.errors.dueDate?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-estimated">Estimated hours</Label>
                <Input id="task-estimated" inputMode="decimal" {...form.register("estimatedHours")} />
                <FieldError message={form.formState.errors.estimatedHours?.message} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="task-priority">Priority</Label>
                <Select id="task-priority" {...form.register("priority")}>
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabels[priority]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-status">Status</Label>
                <Select id="task-status" {...form.register("status")}>
                  {taskStatuses.map((status) => (
                    <option key={status} value={status}>
                      {taskStatusLabels[status]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {formError ? <FieldError message={formError} /> : null}
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save changes" : "Add task"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
