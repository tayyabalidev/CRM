import { TaskIndexPage } from "@/components/tasks/task-index-page";

export default function BugsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    project?: string;
    assignee?: string;
    due?: string;
    sort?: string;
    dir?: string;
    page?: string;
    view?: string;
    hide?: string;
  }>;
}) {
  return <TaskIndexPage kind="bug" searchParams={searchParams} />;
}
