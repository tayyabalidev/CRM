"use client";

import Link from "next/link";
import { Paperclip } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { FileActions } from "@/components/files/file-actions";
import { Card, CardContent } from "@/components/ui/card";
import type { FileListItem } from "@/lib/services/files";
import { formatDate } from "@/lib/utils/dates";
import { formatFileSize } from "@/lib/utils/files";

function AttachmentLinks({ file, canManage }: { file: FileListItem; canManage: boolean }) {
  const links = [
    file.clientId && canManage
      ? { href: `/clients/${file.clientId}`, label: file.clientName ?? "Client" }
      : file.clientId
        ? { href: null, label: file.clientName ?? "Client" }
        : null,
    file.projectId ? { href: `/projects/${file.projectId}`, label: file.projectName ?? "Project" } : null,
    file.taskId ? { href: `/tasks/${file.taskId}`, label: file.taskTitle ?? "Task" } : null,
    file.invoiceId ? { href: `/invoices/${file.invoiceId}`, label: file.invoiceNumber ?? "Invoice" } : null,
  ].filter((link): link is { href: string | null; label: string } => link !== null);

  if (links.length === 0) {
    return <span>Workspace file</span>;
  }

  return (
    <>
      {links.map((link, index) => (
        <span key={`${link.label}-${index}`}>
          {index > 0 ? " · " : null}
          {link.href ? (
            <Link href={link.href} className="hover:underline">
              {link.label}
            </Link>
          ) : (
            link.label
          )}
        </span>
      ))}
    </>
  );
}

export function FileList({
  files,
  timeZone,
  canManage,
  emptyAction,
  hasFilters,
}: {
  files: FileListItem[];
  timeZone: string;
  canManage: boolean;
  emptyAction?: ReactNode;
  hasFilters: boolean;
}) {
  if (files.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<Paperclip className="size-4" />}
            title={hasFilters ? "No matching files" : "No files yet"}
            description={
              hasFilters
                ? "Try a different search or filter."
                : "Upload a file and optionally attach it to a client, project, task, or invoice."
            }
            action={hasFilters ? undefined : emptyAction}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {files.map((file) => (
          <Card key={file.id} size="sm">
            <CardContent className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <p className="truncate font-medium">{file.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <AttachmentLinks file={file} canManage={canManage} />
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(file.createdAt, timeZone)}</p>
              </div>
              <FileActions
                fileId={file.id}
                fileName={file.fileName}
                mimeType={file.mimeType}
                canManage={canManage}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border md:block">
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
          <p>File</p>
          <p>Attached to</p>
          <p>Uploaded</p>
          <p className="text-right">Actions</p>
        </div>
        {files.map((file) => (
          <div
            key={file.id}
            className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] items-center gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{file.fileName}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</p>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              <AttachmentLinks file={file} canManage={canManage} />
            </p>
            <p className="text-xs text-muted-foreground">{formatDate(file.createdAt, timeZone)}</p>
            <FileActions
              fileId={file.id}
              fileName={file.fileName}
              mimeType={file.mimeType}
              canManage={canManage}
            />
          </div>
        ))}
      </div>
    </>
  );
}
