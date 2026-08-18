import { NoteList } from "@/components/notes/note-list";
import { requireWorkspace } from "@/lib/auth/workspace";
import { listPaymentClients, listPaymentProjects } from "@/lib/services/payments";
import { listClientUpdates } from "@/lib/services/notes";

export default async function UpdatesPage() {
  const { workspace, user } = await requireWorkspace();
  const [notes, clients, projects] = await Promise.all([
    listClientUpdates(workspace.id),
    listPaymentClients(workspace.id),
    listPaymentProjects(workspace.id),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Updates</h1>
        <p className="text-sm text-muted-foreground">
          Client-visible updates from your team across projects and deliverables.
        </p>
      </div>

      <NoteList
        notes={notes}
        timeZone={workspace.timezone}
        role={workspace.role}
        userId={user.id}
        clients={clients.map((client) => ({ id: client.id, name: client.name }))}
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
          clientId: project.client_id,
        }))}
        hasFilters={false}
      />
    </div>
  );
}
