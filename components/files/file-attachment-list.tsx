"use client";

import { FileActions } from "@/components/files/file-actions";
import { formatFileSize } from "@/lib/utils/files";

export type AttachedFile = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType?: string | null;
};

export function FileAttachmentList({
  files,
  canManage,
}: {
  files: AttachedFile[];
  canManage: boolean;
}) {
  return (
    <ul className="divide-y">
      {files.map((file) => (
        <li key={file.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.fileName}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</p>
          </div>
          <FileActions
            fileId={file.id}
            fileName={file.fileName}
            mimeType={file.mimeType ?? null}
            canManage={canManage}
          />
        </li>
      ))}
    </ul>
  );
}
