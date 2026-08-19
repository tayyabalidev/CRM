import { notFound } from "next/navigation";

import { TaskDetailView } from "@/components/tasks/task-detail";
import { requireWorkspace } from "@/lib/auth/workspace";
import { listProjectOptions } from "@/lib/services/projects";
import { getTaskDetail, listAssigneeOptions } from "@/lib/services/tasks";
import { isUuid } from "@/lib/utils/ids";
import { isStaffRole } from "@/types/index";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const { workspace, user } = await requireWorkspace();
  const canManage = isStaffRole(workspace.role);
  const detail = await getTaskDetail(workspace.id, id);

  if (!detail) {
    notFound();
  }

  const [projects, assignees] = await Promise.all([
    listProjectOptions(workspace.id, detail.task.project_id ?? undefined),
    canManage ? listAssigneeOptions(workspace.id) : Promise.resolve([]),
  ]);

  return (
    <TaskDetailView
      detail={detail}
      timeZone={workspace.timezone}
      canManage={canManage}
      projects={projects}
      assignees={assignees}
      userId={user.id}
    />
  );
}
