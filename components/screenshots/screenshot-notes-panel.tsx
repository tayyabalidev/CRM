"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Images } from "lucide-react";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createScreenshotNoteAction, deleteScreenshotNoteAction } from "@/lib/actions/screenshot-notes";
import type { ScreenshotNoteItem } from "@/lib/services/screenshot-notes";
import { formatDate, formatTime } from "@/lib/utils/dates";
import {
  FILE_BUCKET,
  IMAGE_ACCEPT,
  mimeFromFile,
  sanitizeFileName,
  validateImageUpload,
} from "@/lib/utils/files";
import { createClient } from "@/lib/supabase/client";

export function ScreenshotNotesPanel({
  workspaceId,
  userId,
  timeZone,
  items,
  clientId,
  projectId,
  taskId,
  canAdd = true,
  canManage = false,
}: {
  workspaceId: string;
  userId: string;
  timeZone: string;
  items: ScreenshotNoteItem[];
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  canAdd?: boolean;
  canManage?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(next: File | null) {
    setFormError(null);

    if (!next) {
      setFile(null);
      return;
    }

    const mimeType = mimeFromFile(next);
    const validationError = validateImageUpload({
      name: next.name,
      size: next.size,
      type: mimeType || next.type,
    });

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFile(next);
  }

  function resetComposer() {
    setMessage("");
    setFile(null);
    setFormError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState
          compact
          icon={<Images className="size-4" />}
          title="No screenshots yet"
          description="Add a short note and attach one screenshot at a time. They’ll stack here as a list."
        />
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="space-y-3 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.message}</p>
                {item.imageUrl ? (
                  <a href={item.imageUrl} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.fileName}
                      className="max-h-[28rem] w-full rounded-lg border object-contain bg-muted/40"
                    />
                  </a>
                ) : (
                  <p className="rounded-lg border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
                    Preview unavailable for {item.fileName}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {item.authorName} · {formatDate(item.createdAt, timeZone)} {formatTime(item.createdAt, timeZone)}
                    {!taskId && item.taskId && item.taskTitle ? (
                      <>
                        {" "}
                        ·{" "}
                        <Link href={`/tasks/${item.taskId}`} className="hover:underline">
                          {item.taskTitle}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  {item.createdBy === userId || canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === item.id}
                      onClick={() => {
                        setDeletingId(item.id);
                        startTransition(async () => {
                          const result = await deleteScreenshotNoteAction(item.id);
                          setDeletingId(null);
                          if (result?.error) {
                            toast.error(result.error);
                            return;
                          }
                          toast.success("Screenshot removed");
                        });
                      }}
                    >
                      {deletingId === item.id ? "Removing..." : "Remove"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAdd ? (
        <form
          className="space-y-3 rounded-xl border border-dashed p-4"
          onPaste={(event) => {
            const pasted = Array.from(event.clipboardData.items)
              .find((item) => item.type.startsWith("image/"))
              ?.getAsFile();
            if (pasted) {
              event.preventDefault();
              chooseFile(pasted);
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            setFormError(null);

            const trimmed = message.trim();
            if (!trimmed) {
              setFormError("Add a short note for this screenshot.");
              return;
            }

            if (!file) {
              setFormError("Attach a screenshot image.");
              return;
            }

            const mimeType = mimeFromFile(file);
            const validationError = validateImageUpload({
              name: file.name,
              size: file.size,
              type: mimeType || file.type,
            });

            if (validationError) {
              setFormError(validationError);
              return;
            }

            startTransition(async () => {
              const id = crypto.randomUUID();
              const fileName = sanitizeFileName(file.name);
              const filePath = `${workspaceId}/${id}/${fileName}`;
              const supabase = createClient();
              const { error: uploadError } = await supabase.storage.from(FILE_BUCKET).upload(filePath, file, {
                upsert: false,
                contentType: mimeType || undefined,
              });

              if (uploadError) {
                setFormError(uploadError.message || "Could not upload this screenshot.");
                return;
              }

              const result = await createScreenshotNoteAction({
                message: trimmed,
                fileId: id,
                fileName,
                filePath,
                fileSize: file.size,
                mimeType: mimeType || "",
                clientId: clientId ?? "",
                projectId: projectId ?? "",
                taskId: taskId ?? "",
              });

              if (result?.error) {
                await supabase.storage.from(FILE_BUCKET).remove([filePath]);
                setFormError(result.error);
                return;
              }

              toast.success("Screenshot added");
              resetComposer();
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`screenshot-note-${taskId ?? projectId ?? "new"}`}>Note</Label>
            <Textarea
              id={`screenshot-note-${taskId ?? projectId ?? "new"}`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Brief note for this screenshot"
              rows={3}
            />
          </div>
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              chooseFile(event.dataTransfer.files[0] ?? null);
            }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Selected screenshot" className="max-h-48 w-full rounded-md object-contain" />
            ) : (
              <>
                <ImagePlus className="size-5 text-muted-foreground" />
                <p className="text-sm font-medium">Attach a screenshot</p>
                <p className="text-xs text-muted-foreground">Click, drop, or paste an image. JPEG, PNG, GIF, or WebP.</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {file && previewUrl ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => chooseFile(null)}>
              Clear image
            </Button>
          ) : null}
          {formError ? <FieldError message={formError} /> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Adding..." : "Add screenshot"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
