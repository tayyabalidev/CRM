"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getActiveWorkspaceIdAction, createScreenshotNoteAction } from "@/lib/actions/screenshot-notes";
import {
  FILE_BUCKET,
  IMAGE_ACCEPT,
  mimeFromFile,
  sanitizeFileName,
  validateImageUpload,
} from "@/lib/utils/files";
import { createClient } from "@/lib/supabase/client";

export type ScreenshotDraft = {
  key: string;
  message: string;
  file: File;
  previewUrl: string;
};

export async function saveScreenshotDrafts(input: {
  drafts: ScreenshotDraft[];
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
}): Promise<{ error?: string }> {
  if (input.drafts.length === 0) {
    return {};
  }

  const workspace = await getActiveWorkspaceIdAction();
  const supabase = createClient();

  for (const draft of input.drafts) {
    const id = crypto.randomUUID();
    const fileName = sanitizeFileName(draft.file.name);
    const mimeType = mimeFromFile(draft.file);
    const filePath = `${workspace.workspaceId}/${id}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from(FILE_BUCKET).upload(filePath, draft.file, {
      upsert: false,
      contentType: mimeType || undefined,
    });

    if (uploadError) {
      return { error: uploadError.message || "Could not upload a screenshot." };
    }

    const result = await createScreenshotNoteAction({
      message: draft.message,
      fileId: id,
      fileName,
      filePath,
      fileSize: draft.file.size,
      mimeType: mimeType || "",
      clientId: input.clientId ?? "",
      projectId: input.projectId ?? "",
      taskId: input.taskId ?? "",
    });

    if (result?.error) {
      await supabase.storage.from(FILE_BUCKET).remove([filePath]);
      return { error: result.error };
    }
  }

  return {};
}

export function collectScreenshotDrafts(
  drafts: ScreenshotDraft[],
  handle: ScreenshotDraftListHandle | null,
): { error: string } | ScreenshotDraft[] {
  const pending = handle?.consumePending() ?? null;

  if (pending && "error" in pending) {
    return pending;
  }

  return pending ? [...drafts, pending] : drafts;
}

export type ScreenshotDraftListHandle = {
  consumePending: () => { error: string } | ScreenshotDraft | null;
};

export const ScreenshotDraftList = forwardRef<
  ScreenshotDraftListHandle,
  {
    items: ScreenshotDraft[];
    onChange: (items: ScreenshotDraft[]) => void;
    disabled?: boolean;
  }
>(function ScreenshotDraftList({ items, onChange, disabled = false }, ref) {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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

  function buildDraft(): { error: string } | ScreenshotDraft | null {
    const trimmed = message.trim();
    if (!trimmed && !file) {
      return null;
    }

    if (!trimmed) {
      return { error: "Add a short note for this screenshot." };
    }

    if (!file) {
      return { error: "Attach a screenshot image." };
    }

    const mimeType = mimeFromFile(file);
    const validationError = validateImageUpload({
      name: file.name,
      size: file.size,
      type: mimeType || file.type,
    });

    if (validationError) {
      return { error: validationError };
    }

    return {
      key: crypto.randomUUID(),
      message: trimmed,
      file,
      previewUrl: URL.createObjectURL(file),
    };
  }

  useImperativeHandle(
    ref,
    () => ({
      consumePending: () => {
        const pending = buildDraft();
        if (pending && !("error" in pending)) {
          resetComposer();
        }
        return pending;
      },
    }),
    [message, file],
  );

  function addItem() {
    const pending = buildDraft();
    if (!pending) {
      setFormError("Add a short note and attach a screenshot.");
      return;
    }

    if ("error" in pending) {
      setFormError(pending.error);
      return;
    }

    onChange([...items, pending]);
    resetComposer();
  }

  return (
    <div
      className="space-y-3"
      onPaste={(event) => {
        const pasted = Array.from(event.clipboardData.items)
          .find((item) => item.type.startsWith("image/"))
          ?.getAsFile();
        if (pasted) {
          event.preventDefault();
          chooseFile(pasted);
        }
      }}
    >
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.key} className="space-y-2 rounded-xl border p-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.message}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt={item.file.name}
                className="max-h-48 w-full rounded-lg border bg-muted/40 object-contain"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  URL.revokeObjectURL(item.previewUrl);
                  onChange(items.filter((entry) => entry.key !== item.key));
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-3 rounded-xl border border-dashed p-3">
        <div className="space-y-1.5">
          <Label htmlFor="screenshot-draft-note">Screenshot note</Label>
          <Textarea
            id="screenshot-draft-note"
            value={message}
            disabled={disabled}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Brief note for this screenshot"
            rows={3}
          />
        </div>
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            chooseFile(event.dataTransfer.files[0] ?? null);
          }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Selected screenshot" className="max-h-40 w-full rounded-md object-contain" />
          ) : (
            <>
              <ImagePlus className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">Attach a screenshot</p>
              <p className="text-xs text-muted-foreground">Click, drop, or paste. Then add it to the list.</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            disabled={disabled}
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {formError ? <FieldError message={formError} /> : null}
        <Button type="button" variant="outline" disabled={disabled} onClick={addItem}>
          Add screenshot to list
        </Button>
      </div>
    </div>
  );
});
