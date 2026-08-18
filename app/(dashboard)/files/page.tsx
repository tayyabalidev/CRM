import { Plus } from "lucide-react";

import { FileList } from "@/components/files/file-list";
import { FilePagination } from "@/components/files/file-pagination";
import { FileToolbar } from "@/components/files/file-toolbar";
import { FileUploadSheet } from "@/components/files/file-upload-sheet";
import { Button } from "@/components/ui/button";
import { requireWorkspace } from "@/lib/auth/workspace";
import { parseFileListParams } from "@/lib/files/params";
import { getFilePageData, listFileTaskOptions } from "@/lib/services/files";
import { listInvoiceOptions, listPaymentClients, listPaymentProjects } from "@/lib/services/payments";
import { isStaffRole } from "@/types/index";

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    client?: string;
    project?: string;
    task?: string;
    invoice?: string;
    page?: string;
  }>;
}) {
  const params = parseFileListParams(await searchParams);
  const { workspace } = await requireWorkspace();
  const canManage = isStaffRole(workspace.role);
  const canUpload = canManage || Boolean(workspace.clientId);
  const [result, clients, projects, tasks, invoices] = await Promise.all([
    getFilePageData(workspace.id, params),
    listPaymentClients(workspace.id),
    listPaymentProjects(workspace.id),
    listFileTaskOptions(workspace.id),
    listInvoiceOptions(workspace.id),
  ]);
  const clientOptions = clients.map((client) => ({ id: client.id, name: client.name }));
  const projectOptions = projects.map((project) => ({
    id: project.id,
    name: project.name,
    clientId: project.client_id,
  }));
  const invoiceOptions = invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
  }));
  const defaultProject = projectOptions.find((project) => project.id === params.projectId);
  const defaultClientId = params.clientId || defaultProject?.clientId;
  const hasFilters =
    Boolean(params.q) ||
    Boolean(params.clientId) ||
    Boolean(params.projectId) ||
    Boolean(params.taskId) ||
    Boolean(params.invoiceId);
  const addButton = canUpload ? (
    <FileUploadSheet
      workspaceId={workspace.id}
      clients={clientOptions}
      projects={projectOptions}
      tasks={tasks}
      invoices={invoiceOptions}
      defaultClientId={defaultClientId || undefined}
      lockedClientId={!canManage ? (workspace.clientId ?? undefined) : undefined}
      defaultProjectId={params.projectId || undefined}
      defaultTaskId={params.taskId || undefined}
      defaultInvoiceId={params.invoiceId || undefined}
      trigger={
        <Button>
          <Plus /> Upload file
        </Button>
      }
    />
  ) : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Private uploads for clients, projects, tasks, and invoices. Nothing is public."
              : "Files shared on your projects, tasks, and invoices. You can also upload files for your team."}
          </p>
        </div>
        {addButton}
      </div>

      <FileToolbar
        params={params}
        clients={clientOptions}
        projects={projectOptions}
        tasks={tasks}
        invoices={invoiceOptions}
        hideClientFilter={!canManage}
      />
      <FileList
        files={result.files}
        timeZone={workspace.timezone}
        canManage={canManage}
        hasFilters={hasFilters}
        emptyAction={addButton ?? undefined}
      />
      <FilePagination params={params} page={result.page} pageCount={result.pageCount} total={result.total} />
    </div>
  );
}
