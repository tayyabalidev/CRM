"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FieldError } from "@/components/auth/field-error";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addTaskCommentAction } from "@/lib/actions/tasks";
import type { TaskComment } from "@/lib/services/tasks";
import { formatDate, formatTime } from "@/lib/utils/dates";
import { type TaskCommentInput, taskCommentSchema } from "@/lib/validations/task";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TaskComments({
  taskId,
  comments,
  timeZone,
  canComment,
}: {
  taskId: string;
  comments: TaskComment[];
  timeZone: string;
  canComment: boolean;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<TaskCommentInput>({
    resolver: zodResolver(taskCommentSchema),
    defaultValues: { content: "" },
  });

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <EmptyState compact title="No comments yet" description="Start the conversation on this task." />
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar size="sm">
                {comment.authorAvatar ? <AvatarImage src={comment.authorAvatar} alt="" /> : null}
                <AvatarFallback>{initials(comment.authorName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="text-sm font-medium">{comment.authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(comment.createdAt, timeZone)} {formatTime(comment.createdAt, timeZone)}
                  </p>
                </div>
                <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canComment ? (
        <form
          className="space-y-2"
          onSubmit={form.handleSubmit((values) => {
            setFormError(null);
            startTransition(async () => {
              const result = await addTaskCommentAction(taskId, values);
              if (result?.error) {
                setFormError(result.error);
                return;
              }
              form.reset({ content: "" });
            });
          })}
        >
          <Textarea rows={3} placeholder="Write a comment" {...form.register("content")} />
          <FieldError message={form.formState.errors.content?.message ?? formError ?? undefined} />
          <Button type="submit" disabled={pending}>
            {pending ? "Posting..." : "Add comment"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
