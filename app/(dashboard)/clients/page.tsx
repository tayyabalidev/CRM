import { Plus } from "lucide-react";

import { ClientFormSheet } from "@/components/clients/client-form-sheet";
import { ClientList } from "@/components/clients/client-list";
import { ClientPagination } from "@/components/clients/client-pagination";
import { ClientToolbar } from "@/components/clients/client-toolbar";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth/workspace";
import { parseClientListParams } from "@/lib/clients/params";
import { listClients } from "@/lib/services/clients";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  const params = parseClientListParams(await searchParams);
  const { workspace } = await requireStaff();
  const result = await listClients(workspace.id, params);
  const hasFilters = Boolean(params.q) || params.status !== "active";
  const addButton = (
    <ClientFormSheet
      trigger={
        <Button>
          <Plus /> Add client
        </Button>
      }
    />
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            People and companies you work with in {workspace.name}.
          </p>
        </div>
        {addButton}
      </div>

      <ClientToolbar params={params} />

      <ClientList
        clients={result.clients}
        timeZone={workspace.timezone}
        canManage
        hasFilters={hasFilters}
        emptyAction={addButton}
      />

      <ClientPagination
        params={params}
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
      />
    </div>
  );
}
