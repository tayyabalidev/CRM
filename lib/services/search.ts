import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/utils/text";
import { isStaffRole, type WorkspaceRole } from "@/types/index";

export type SearchEntity = "client" | "project" | "task" | "invoice";

export type SearchHit = {
  id: string;
  type: SearchEntity;
  title: string;
  subtitle: string | null;
  href: string;
};

const LIMIT = 5;

function relatedName(value: { name: string } | { name: string }[] | null | undefined) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0]?.name ?? null) : value.name;
}

export async function searchWorkspace(
  workspaceId: string,
  rawQuery: string,
  options: { role: WorkspaceRole; clientId: string | null },
): Promise<SearchHit[]> {
  const q = sanitizeSearch(rawQuery);

  if (q.length < 1) {
    return [];
  }

  const pattern = `%${q}%`;
  const staff = isStaffRole(options.role);
  const supabase = await createClient();

  const clientsPromise = staff
    ? supabase
        .from("clients")
        .select("id, name, company, email")
        .eq("workspace_id", workspaceId)
        .or(`name.ilike.%${q}%,company.ilike.%${q}%,email.ilike.%${q}%`)
        .order("name", { ascending: true })
        .limit(LIMIT)
    : Promise.resolve({ data: [] as { id: string; name: string; company: string | null; email: string | null }[] });

  let projectsQuery = supabase
    .from("projects")
    .select("id, name, status, clients ( name )")
    .eq("workspace_id", workspaceId)
    .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    .order("name", { ascending: true })
    .limit(LIMIT);

  let tasksQuery = supabase
    .from("tasks")
    .select("id, title, status, projects ( name )")
    .eq("workspace_id", workspaceId)
    .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    .order("title", { ascending: true })
    .limit(LIMIT);

  let invoicesQuery = supabase
    .from("invoices")
    .select("id, invoice_number, status, clients ( name )")
    .eq("workspace_id", workspaceId)
    .ilike("invoice_number", pattern)
    .order("invoice_number", { ascending: false })
    .limit(LIMIT);

  if (!staff && options.clientId) {
    projectsQuery = projectsQuery.eq("client_id", options.clientId);
    tasksQuery = tasksQuery.eq("client_id", options.clientId);
    invoicesQuery = invoicesQuery.eq("client_id", options.clientId);
  }

  const [clientsResult, projectsResult, tasksResult, invoicesResult] = await Promise.all([
    clientsPromise,
    projectsQuery,
    tasksQuery,
    invoicesQuery,
  ]);

  const hits: SearchHit[] = [];

  for (const client of clientsResult.data ?? []) {
    const bits = [client.company, client.email].filter(Boolean);
    hits.push({
      id: client.id,
      type: "client",
      title: client.name,
      subtitle: bits.length > 0 ? bits.join(" · ") : null,
      href: `/clients/${client.id}`,
    });
  }

  for (const project of projectsResult.data ?? []) {
    const clientName = relatedName(project.clients);
    hits.push({
      id: project.id,
      type: "project",
      title: project.name,
      subtitle: [clientName, project.status.replaceAll("_", " ")].filter(Boolean).join(" · ") || null,
      href: `/projects/${project.id}`,
    });
  }

  for (const task of tasksResult.data ?? []) {
    const projectName = relatedName(task.projects as { name: string } | { name: string }[] | null);
    hits.push({
      id: task.id,
      type: "task",
      title: task.title,
      subtitle: [projectName, task.status.replaceAll("_", " ")].filter(Boolean).join(" · ") || null,
      href: `/tasks/${task.id}`,
    });
  }

  for (const invoice of invoicesResult.data ?? []) {
    const clientName = relatedName(invoice.clients);
    hits.push({
      id: invoice.id,
      type: "invoice",
      title: invoice.invoice_number,
      subtitle: [clientName, invoice.status.replaceAll("_", " ")].filter(Boolean).join(" · ") || null,
      href: `/invoices/${invoice.id}`,
    });
  }

  return hits;
}
