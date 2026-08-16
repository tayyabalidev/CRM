import { Plus } from "lucide-react";

import { NoteFormSheet } from "@/components/notes/note-form-sheet";
import { NoteList } from "@/components/notes/note-list";
import { NotePagination } from "@/components/notes/note-pagination";
import { NoteToolbar } from "@/components/notes/note-toolbar";
import { Button } from "@/components/ui/button";
import { requireWorkspace } from "@/lib/auth/workspace";
import { canCreateNote } from "@/lib/notes/access";
import { parseNoteListParams } from "@/lib/notes/params";
import { getNotePageData } from "@/lib/services/notes";
import { listPaymentClients, listPaymentProjects } from "@/lib/services/payments";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    client?: string;
    project?: string;
    visibility?: string;
    page?: string;
  }>;
}) {
  const params = parseNoteListParams(await searchParams);
  const { workspace, user } = await requireWorkspace();
  const canManage = canCreateNote(workspace.role);
  const [result, clients, projects] = await Promise.all([
    getNotePageData(workspace.id, params),
    listPaymentClients(workspace.id),
    listPaymentProjects(workspace.id),
  ]);
  const clientOptions = clients.map((client) => ({ id: client.id, name: client.name }));
  const projectOptions = projects.map((project) => ({
    id: project.id,
    name: project.name,
    clientId: project.client_id,
  }));
  const defaultProject = projectOptions.find((project) => project.id === params.projectId);
  const defaultClientId = params.clientId || defaultProject?.clientId;
  const hasFilters =
    Boolean(params.q) ||
    Boolean(params.clientId) ||
    Boolean(params.projectId) ||
    params.visibility !== "all";
  const addButton = canManage ? (
    <NoteFormSheet
      clients={clientOptions}
      projects={projectOptions}
      defaultClientId={defaultClientId || undefined}
      defaultProjectId={params.projectId || undefined}
      trigger={
        <Button>
          <Plus /> Add note
        </Button>
      }
    />
  ) : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Private notes stay with you. Team notes are for staff. Client notes never include internal detail."
              : "Notes shared with you. Internal team notes are never shown here."}
          </p>
        </div>
        {addButton}
      </div>

      <NoteToolbar
        params={params}
        clients={clientOptions}
        projects={projectOptions}
        hideClientFilter={!canManage}
        hideVisibility={!canManage}
      />
      <NoteList
        notes={result.notes}
        timeZone={workspace.timezone}
        role={workspace.role}
        userId={user.id}
        clients={clientOptions}
        projects={projectOptions}
        hasFilters={hasFilters}
        emptyAction={addButton ?? undefined}
      />
      <NotePagination params={params} page={result.page} pageCount={result.pageCount} total={result.total} />
    </div>
  );
}
