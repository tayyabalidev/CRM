"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFileSignedUrlAction } from "@/lib/actions/files";
import { isPreviewableMime } from "@/lib/utils/files";

export function FilePreviewButton({
  fileId,
  fileName,
  mimeType,
}: {
  fileId: string;
  fileName: string;
  mimeType: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isPreviewableMime(mimeType)) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await getFileSignedUrlAction(fileId);
            if ("error" in result || !result.url) {
              toast.error(result.error ?? "Could not preview this file.");
              return;
            }
            setUrl(result.url);
            setOpen(true);
          });
        }}
      >
        {pending ? "Opening..." : "Preview"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{fileName}</DialogTitle>
            <DialogDescription>Private preview. This link expires shortly.</DialogDescription>
          </DialogHeader>
          {url && mimeType?.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={fileName} className="max-h-[70vh] w-full rounded-lg object-contain" />
          ) : null}
          {url && mimeType === "application/pdf" ? (
            <iframe title={fileName} src={url} className="h-[70vh] w-full rounded-lg border" />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
