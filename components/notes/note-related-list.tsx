"use client";

import { useState } from "react";

import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import {
  NoteFormSheet,
  type NoteFormClient,
  type NoteFormProject,
  type NoteFormValues,
} from "@/components/notes/note-form-sheet";
import { NoteVisibilityBadge } from "@/components/notes/note-visibility-badge";
import { Button } from "@/components/ui/button";
import { canEditNote } from "@/lib/notes/access";
import { formatDate } from "@/lib/utils/dates";
import { isStaffRole, type NoteVisibility, type WorkspaceRole } from "@/types/index";

export type RelatedNote = {
  id: string;
  title: string;
  content: string | null;
  visibility: NoteVisibility;
  createdAt: string;
  createdBy: string | null;
  clientId?: string | null;
  projectId?: string | null;
};

export function NoteRelatedList({
  notes,
  timeZone,
  role,
  userId,
  clients = [],
  projects = [],
  defaultClientId,
  defaultProjectId,
  lockTargets = false,
}: {
  notes: RelatedNote[];
  timeZone: string;
  role: WorkspaceRole;
  userId: string;
  clients?: NoteFormClient[];
  projects?: NoteFormProject[];
  defaultClientId?: string;
  defaultProjectId?: string;
  lockTargets?: boolean;
}) {
  return (
    <ul className="divide-y">
      {notes.map((note) => (
        <li key={note.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{note.title}</p>
              <p className="text-xs text-muted-foreground">{formatDate(note.createdAt, timeZone)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isStaffRole(role) ? <NoteVisibilityBadge value={note.visibility} /> : null}
              {canEditNote(role, userId, note.createdBy) ? (
                <RelatedNoteActions
                  note={note}
                  clients={clients}
                  projects={projects}
                  defaultClientId={defaultClientId}
                  defaultProjectId={defaultProjectId}
                  lockTargets={lockTargets}
                />
              ) : null}
            </div>
          </div>
          {note.content ? (
            <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{note.content}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function RelatedNoteActions({
  note,
  clients,
  projects,
  defaultClientId,
  defaultProjectId,
  lockTargets,
}: {
  note: RelatedNote;
  clients: NoteFormClient[];
  projects: NoteFormProject[];
  defaultClientId?: string;
  defaultProjectId?: string;
  lockTargets: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const formNote: NoteFormValues & { id: string } = {
    id: note.id,
    title: note.title,
    content: note.content,
    visibility: note.visibility,
    clientId: note.clientId ?? defaultClientId ?? null,
    projectId: note.projectId ?? defaultProjectId ?? null,
  };

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
        Edit
      </Button>
      <NoteFormSheet
        note={formNote}
        clients={clients}
        projects={projects}
        defaultClientId={defaultClientId}
        defaultProjectId={defaultProjectId}
        lockTargets={lockTargets}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteNoteDialog
        noteId={note.id}
        title={note.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        trigger={
          <Button type="button" variant="ghost" size="sm">
            Delete
          </Button>
        }
      />
    </>
  );
}
