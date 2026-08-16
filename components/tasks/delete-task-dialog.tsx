"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteTaskAction } from "@/lib/actions/tasks";

export function DeleteTaskDialog({
  taskId,
  taskTitle,
  trigger,
  open,
  onOpenChange,
}: {
  taskId: string;
  taskTitle: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogOpen = open ?? uncontrolledOpen;
  const setDialogOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(next) => {
        setDialogOpen(next);
        if (next) {
          setError(null);
        }
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {taskTitle}?</DialogTitle>
          <DialogDescription>
            This permanently deletes the task and its comments. Time entries stay on the project if
            they exist. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error ? <FieldError message={error} /> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await deleteTaskAction(taskId);
                if (result?.error) {
                  setError(result.error);
                }
              });
            }}
          >
            {pending ? "Deleting..." : "Delete task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
