"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
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
import { createFileRecordAction } from "@/lib/actions/files";
import { createClient } from "@/lib/supabase/client";
import {
  FILE_ACCEPT,
  FILE_BUCKET,
  mimeFromFile,
  sanitizeFileName,
  validateUploadFile,
} from "@/lib/utils/files";

export type FileUploadClient = { id: string; name: string };
export type FileUploadProject = { id: string; name: string; clientId: string };
export type FileUploadTask = { id: string; title: string; projectId: string | null; clientId: string | null };
export type FileUploadInvoice = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  projectId: string | null;
};

export function FileUploadSheet({
  workspaceId,
  clients = [],
  projects = [],
  tasks = [],
  invoices = [],
  defaultClientId,
  lockedClientId,
  defaultProjectId,
  defaultTaskId,
  defaultInvoiceId,
  lockTargets = false,
  trigger,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  clients?: FileUploadClient[];
  projects?: FileUploadProject[];
  tasks?: FileUploadTask[];
  invoices?: FileUploadInvoice[];
  defaultClientId?: string;
  lockedClientId?: string;
  defaultProjectId?: string;
  defaultTaskId?: string;
  defaultInvoiceId?: string;
  lockTargets?: boolean;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [clientId, setClientId] = useState(lockedClientId ?? defaultClientId ?? "");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [taskId, setTaskId] = useState(defaultTaskId ?? "");
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId ?? "");
  const sheetOpen = open ?? uncontrolledOpen;
  const setSheetOpen = onOpenChange ?? setUncontrolledOpen;
  const effectiveClientId = lockedClientId ?? clientId;
  const visibleProjects = projects.filter((project) => !effectiveClientId || project.clientId === effectiveClientId);
  const visibleTasks = tasks.filter((task) => {
    if (projectId && task.projectId !== projectId) {
      return false;
    }

    if (effectiveClientId && task.clientId && task.clientId !== effectiveClientId) {
      return false;
    }

    return true;
  });
  const visibleInvoices = invoices.filter((invoice) => {
    if (effectiveClientId && invoice.clientId !== effectiveClientId) {
      return false;
    }

    if (projectId && invoice.projectId && invoice.projectId !== projectId) {
      return false;
    }

    return true;
  });

  function resetFields() {
    setFile(null);
    setFileKey((key) => key + 1);
    setClientId(lockedClientId ?? defaultClientId ?? "");
    setProjectId(defaultProjectId ?? "");
    setTaskId(defaultTaskId ?? "");
    setInvoiceId(defaultInvoiceId ?? "");
    setFormError(null);
  }

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(next) => {
        setSheetOpen(next);
        if (next) {
          resetFields();
        }
      }}
    >
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>Upload file</SheetTitle>
          <SheetDescription>
            Files stay private. Images and PDFs can be previewed in the browser. Maximum 20 MB.
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            setFormError(null);

            if (!file) {
              setFormError("Choose a file to upload.");
              return;
            }

            const mimeType = mimeFromFile(file);
            const validationError = validateUploadFile({
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
                setFormError(uploadError.message || "Could not upload this file.");
                return;
              }

              const result = await createFileRecordAction({
                id,
                fileName,
                filePath,
                fileSize: file.size,
                mimeType: mimeType || "",
                clientId: lockedClientId ?? (lockTargets ? (defaultClientId ?? "") : clientId),
                projectId: lockTargets ? (defaultProjectId ?? "") : projectId,
                taskId: lockTargets ? (defaultTaskId ?? "") : taskId,
                invoiceId: lockTargets ? (defaultInvoiceId ?? "") : invoiceId,
              });

              if (result?.error) {
                await supabase.storage.from(FILE_BUCKET).remove([filePath]);
                setFormError(result.error);
                return;
              }

              toast.success("File uploaded");
              setSheetOpen(false);
            });
          }}
        >
          <div className="flex-1 space-y-3 overflow-y-auto px-4">
            <div className="space-y-1.5">
              <Label htmlFor="file-upload">File</Label>
              <Input
                id="file-upload"
                key={fileKey}
                type="file"
                accept={FILE_ACCEPT}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            {lockTargets ? null : (
              <>
                {lockedClientId ? null : (
                  <div className="space-y-1.5">
                    <Label htmlFor="file-client">Client</Label>
                    <Select
                      id="file-client"
                      value={clientId}
                      onChange={(event) => {
                        setClientId(event.target.value);
                        setProjectId("");
                        setTaskId("");
                        setInvoiceId("");
                      }}
                    >
                      <option value="">No client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="file-project">Project</Label>
                  <Select
                    id="file-project"
                    value={projectId}
                    onChange={(event) => {
                      setProjectId(event.target.value);
                      setTaskId("");
                      setInvoiceId("");
                    }}
                  >
                    <option value="">No project</option>
                    {visibleProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="file-task">Task</Label>
                  <Select id="file-task" value={taskId} onChange={(event) => setTaskId(event.target.value)}>
                    <option value="">No task</option>
                    {visibleTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="file-invoice">Invoice</Label>
                  <Select
                    id="file-invoice"
                    value={invoiceId}
                    onChange={(event) => setInvoiceId(event.target.value)}
                  >
                    <option value="">No invoice</option>
                    {visibleInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber}
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
              {pending ? "Uploading..." : "Upload file"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
