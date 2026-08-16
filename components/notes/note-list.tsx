"use client";

import Link from "next/link";
import { MoreHorizontal, StickyNote } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import {
  NoteFormSheet,
  type NoteFormClient,
  type NoteFormProject,
  type NoteFormValues,
} from "@/components/notes/note-form-sheet";
import { NoteVisibilityBadge } from "@/components/notes/note-visibility-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { canEditNote } from "@/lib/notes/access";
import type { NoteListItem } from "@/lib/services/notes";
import { formatDate } from "@/lib/utils/dates";
import { isStaffRole, type WorkspaceRole } from "@/types/index";

function toFormNote(note: NoteListItem): NoteFormValues & { id: string } {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    visibility: note.visibility,
    clientId: note.clientId,
    projectId: note.projectId,
  };
}

export function NoteList({
  notes,
  timeZone,
  role,
  userId,
  clients,
  projects,
  emptyAction,
  hasFilters,
}: {
  notes: NoteListItem[];
  timeZone: string;
  role: WorkspaceRole;
  userId: string;
  clients: NoteFormClient[];
  projects: NoteFormProject[];
  emptyAction?: ReactNode;
  hasFilters: boolean;
}) {
  if (notes.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<StickyNote className="size-4" />}
            title={hasFilters ? "No matching notes" : "No notes yet"}
            description={
              hasFilters
                ? "Try a different search or filter."
                : isStaffRole(role)
                  ? "Add a note to a client or project. Private notes never appear to clients."
                  : "Notes shared with you will appear here."
            }
            action={hasFilters ? undefined : emptyAction}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      {notes.map((note) => (
        <article key={note.id} className="space-y-2 border-b px-4 py-3 last:border-b-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{note.title}</p>
              <p className="text-xs text-muted-foreground">
                {note.clientId && isStaffRole(role) ? (
                  <Link href={`/clients/${note.clientId}`} className="hover:underline">
                    {note.clientName ?? "Client"}
                  </Link>
                ) : (
                  (note.clientName ?? (note.clientId ? "Client" : "No client"))
                )}
                {note.projectId ? (
                  <>
                    {" · "}
                    <Link href={`/projects/${note.projectId}`} className="hover:underline">
                      {note.projectName ?? "Project"}
                    </Link>
                  </>
                ) : null}
                {" · "}
                {formatDate(note.updatedAt, timeZone)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isStaffRole(role) ? <NoteVisibilityBadge value={note.visibility} /> : null}
              {canEditNote(role, userId, note.createdBy) ? (
                <NoteRowActions note={toFormNote(note)} clients={clients} projects={projects} />
              ) : null}
            </div>
          </div>
          {note.content ? (
            <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{note.content}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function NoteRowActions({
  note,
  clients,
  projects,
}: {
  note: NoteFormValues & { id: string };
  clients: NoteFormClient[];
  projects: NoteFormProject[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Note actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NoteFormSheet
        note={note}
        clients={clients}
        projects={projects}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteNoteDialog noteId={note.id} title={note.title} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
