import { notFound } from "next/navigation";

import { ProjectOverview } from "@/components/projects/project-overview";
import { parseProjectTab } from "@/components/projects/project-tabs";
import { requireWorkspace } from "@/lib/auth/workspace";
import { listClientOptions } from "@/lib/services/clients";
import { getProjectDetail } from "@/lib/services/projects";
import { isUuid } from "@/lib/utils/ids";
import { isStaffRole } from "@/types/index";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;

  if (!isUuid(id)) {
    notFound();
  }

  const { workspace, user } = await requireWorkspace();
  const canManage = isStaffRole(workspace.role);
  const detail = await getProjectDetail(workspace.id, id);

  if (!detail) {
    notFound();
  }

  const clients = canManage ? await listClientOptions(workspace.id, detail.project.client_id) : [];
  const tab = parseProjectTab(rawTab);
  const current = !canManage && tab === "time" ? "overview" : tab;

  return (
    <ProjectOverview
      detail={detail}
      tab={current}
      timeZone={workspace.timezone}
      canManage={canManage}
      clients={clients}
      role={workspace.role}
      userId={user.id}
    />
  );
}
