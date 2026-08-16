"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ClientFormSheet } from "@/components/clients/client-form-sheet";
import { DeleteClientDialog } from "@/components/clients/delete-client-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveClientAction, restoreClientAction } from "@/lib/actions/clients";
import type { ClientRecord } from "@/lib/services/clients";

export function ClientRowActions({ client }: { client: ClientRecord }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${client.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/clients/${client.id}`}>View</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit</DropdownMenuItem>
          {client.status === "archived" ? (
            <DropdownMenuItem
              disabled={pending}
              onSelect={() => {
                startTransition(async () => {
                  const result = await restoreClientAction(client.id);
                  if (result?.error) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Client restored");
                });
              }}
            >
              Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setArchiveOpen(true)}>Archive</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ClientFormSheet client={client} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteClientDialog
        clientId={client.id}
        clientName={client.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={`Archive ${client.name}?`}
        description="Archived clients stay in your workspace but are hidden from the default active list."
        confirmLabel="Archive client"
        pendingLabel="Archiving…"
        onConfirm={async () => {
          const result = await archiveClientAction(client.id);
          if (result?.error) {
            return result.error;
          }
          toast.success("Client archived");
        }}
      />
    </>
  );
}
