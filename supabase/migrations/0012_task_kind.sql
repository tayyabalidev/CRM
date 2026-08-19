-- WorkFlow CRM — separate bugs from regular tasks
-- Additive. Safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'task_kind'
  ) then
    create type public.task_kind as enum ('task', 'bug');
  end if;
end
$$;

alter table public.tasks
  add column if not exists kind public.task_kind not null default 'task';

alter table public.tasks
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

create index if not exists tasks_workspace_kind_idx
  on public.tasks (workspace_id, kind);

drop policy if exists tasks_insert on public.tasks;

create policy tasks_insert
  on public.tasks
  for insert
  to authenticated
  with check (
    public.is_workspace_staff(workspace_id)
    or (
      kind = 'bug'
      and created_by = auth.uid()
      and public.is_scoped_client(workspace_id, client_id)
    )
  );
