"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { noteVisibilityHints, noteVisibilityLabels } from "@/components/notes/labels";
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
import { createNoteAction, updateNoteAction } from "@/lib/actions/notes";
import { noteSchema, type NoteInput } from "@/lib/validations/note";
import { noteVisibilities, type NoteVisibility } from "@/types/index";

export type NoteFormClient = { id: string; name: string };
export type NoteFormProject = { id: string; name: string; clientId: string };

export type NoteFormValues = {
  id?: string;
  title: string;
  content: string | null;
  visibility: NoteVisibility;
  clientId: string | null;
  projectId: string | null;
};

function toDefaults(
  note: NoteFormValues | undefined,
  defaults: { clientId?: string; projectId?: string },
): NoteInput {
  return {
    title: note?.title ?? "",
    content: note?.content ?? "",
    visibility: note?.visibility ?? "private",
    clientId: note?.clientId ?? defaults.clientId ?? "",
    projectId: note?.projectId ?? defaults.projectId ?? "",
  };
}

export function NoteFormSheet({
  note,
  clients = [],
  projects = [],
  defaultClientId,
  defaultProjectId,
  lockTargets = false,
  trigger,
  open,
  onOpenChange,
}: {
  note?: NoteFormValues;
  clients?: NoteFormClient[];
  projects?: NoteFormProject[];
  defaultClientId?: string;
  defaultProjectId?: string;
  lockTargets?: boolean;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(note?.id);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sheetOpen = open ?? uncontrolledOpen;
  const setSheetOpen = onOpenChange ?? setUncontrolledOpen;
  const initial = toDefaults(note, { clientId: defaultClientId, projectId: defaultProjectId });
  const form = useForm<NoteInput>({
    resolver: zodResolver(noteSchema),
    defaultValues: initial,
  });
  const [clientId, setClientId] = useState(initial.clientId);
  const [visibility, setVisibility] = useState<NoteVisibility>(initial.visibility);
  const visibleProjects = projects.filter((project) => !clientId || project.clientId === clientId);

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(next) => {
        setSheetOpen(next);
        if (next) {
          const nextDefaults = toDefaults(note, { clientId: defaultClientId, projectId: defaultProjectId });
          form.reset(nextDefaults);
          setClientId(nextDefaults.clientId);
          setVisibility(nextDefaults.visibility);
          setFormError(null);
        }
      }}
    >
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit note" : "Add note"}</SheetTitle>
          <SheetDescription>
            Private notes stay with you. Team notes are for staff. Client notes are visible to that client.
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit((values) => {
            setFormError(null);
            startTransition(async () => {
              const result =
                isEdit && note?.id ? await updateNoteAction(note.id, values) : await createNoteAction(values);

              if (result?.error) {
                setFormError(result.error);
                return;
              }

              toast.success(isEdit ? "Note saved" : "Note added");
              setSheetOpen(false);
            });
          })}
        >
          <div className="flex-1 space-y-3 overflow-y-auto px-4">
            <div className="space-y-1.5">
              <Label htmlFor="note-title">Title</Label>
              <Input id="note-title" {...form.register("title")} />
              <FieldError message={form.formState.errors.title?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-content">Content</Label>
              <Textarea id="note-content" rows={8} {...form.register("content")} />
              <FieldError message={form.formState.errors.content?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-visibility">Visibility</Label>
              <Select
                id="note-visibility"
                {...form.register("visibility", {
                  onChange: (event) => setVisibility(event.target.value as NoteVisibility),
                })}
              >
                {noteVisibilities.map((value) => (
                  <option key={value} value={value}>
                    {noteVisibilityLabels[value]}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">{noteVisibilityHints[visibility]}</p>
            </div>
            {lockTargets ? (
              <>
                <input type="hidden" {...form.register("clientId")} />
                <input type="hidden" {...form.register("projectId")} />
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="note-client">Client</Label>
                  <Select
                    id="note-client"
                    {...form.register("clientId", {
                      onChange: (event) => {
                        setClientId(event.target.value);
                        form.setValue("projectId", "");
                      },
                    })}
                  >
                    <option value="">No client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </Select>
                  <FieldError message={form.formState.errors.clientId?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="note-project">Project</Label>
                  <Select id="note-project" {...form.register("projectId")}>
                    <option value="">No project</option>
                    {visibleProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            )}
            {formError ? <FieldError message={formError} /> : null}
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save changes" : "Add note"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
