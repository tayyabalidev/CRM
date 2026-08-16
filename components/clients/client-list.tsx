import Link from "next/link";
import type { ReactNode } from "react";
import { Users } from "lucide-react";

import { ClientRowActions } from "@/components/clients/client-row-actions";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import type { ClientRecord } from "@/lib/services/clients";
import { formatDate } from "@/lib/utils/dates";

export function ClientList({
  clients,
  timeZone,
  canManage,
  emptyAction,
  hasFilters,
}: {
  clients: ClientRecord[];
  timeZone: string;
  canManage: boolean;
  emptyAction?: ReactNode;
  hasFilters: boolean;
}) {
  if (clients.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<Users className="size-4" />}
            title={hasFilters ? "No matching clients" : "No clients yet"}
            description={
              hasFilters
                ? "Try a different search, status, or sort order."
                : "Add a client to start tracking projects, invoices, and payments."
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
        {clients.map((client) => (
          <Card key={client.id} size="sm">
            <CardContent className="flex items-start justify-between gap-3">
              <Link href={`/clients/${client.id}`} className="min-w-0 space-y-1">
                <p className="truncate font-medium">{client.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {client.company || client.email || "No company"}
                </p>
                <ClientStatusBadge value={client.status} />
              </Link>
              {canManage ? <ClientRowActions client={client} /> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden min-w-0 md:block">
        <CardContent className="overflow-x-auto px-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
                {canManage ? (
                  <th className="px-4 py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{client.company ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{client.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <ClientStatusBadge value={client.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(client.created_at, timeZone)}
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3 text-right">
                      <ClientRowActions client={client} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
