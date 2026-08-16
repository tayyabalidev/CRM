-- Additive performance indexes for common list / report filters.
-- Safe to re-run (IF NOT EXISTS).

create index if not exists invoices_workspace_issue_date_idx
  on public.invoices (workspace_id, issue_date desc, created_at desc);

create index if not exists files_workspace_created_idx
  on public.files (workspace_id, created_at desc);

create index if not exists time_entries_workspace_started_idx
  on public.time_entries (workspace_id, started_at desc);

create index if not exists time_entries_workspace_ended_idx
  on public.time_entries (workspace_id, started_at)
  where ended_at is not null;

create index if not exists tasks_workspace_title_idx
  on public.tasks (workspace_id, title);

create index if not exists projects_workspace_name_idx
  on public.projects (workspace_id, name);

create index if not exists notifications_workspace_user_unread_count_idx
  on public.notifications (workspace_id, user_id)
  where read = false;
