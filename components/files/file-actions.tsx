"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { DeleteFileDialog } from "@/components/files/delete-file-dialog";
import { FilePreviewButton } from "@/components/files/file-preview-button";
import { cn } from "@/lib/utils";

export function FileActions({
  fileId,
  fileName,
  mimeType,
  canManage,
}: {
  fileId: string;
  fileName: string;
  mimeType: string | null;
  canManage: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <FilePreviewButton fileId={fileId} fileName={fileName} mimeType={mimeType} />
      <a href={`/files/${fileId}/download`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
        Download
      </a>
      {canManage ? (
        <DeleteFileDialog
          fileId={fileId}
          fileName={fileName}
          trigger={
            <Button type="button" variant="ghost" size="sm">
              Delete
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
