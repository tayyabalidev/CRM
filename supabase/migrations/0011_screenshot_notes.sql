-- WorkFlow CRM — screenshot notes for projects and tasks
-- Additive. Safe to re-run.

create table if not exists public.screenshot_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(trim(message)) > 0 and char_length(message) <= 2000),
  created_at timestamptz not null default now(),
  constraint screenshot_notes_parent_check check (project_id is not null or task_id is not null)
);

create index if not exists screenshot_notes_project_idx
  on public.screenshot_notes (project_id, created_at desc);
create index if not exists screenshot_notes_task_idx
  on public.screenshot_notes (task_id, created_at desc);
create index if not exists screenshot_notes_workspace_idx
  on public.screenshot_notes (workspace_id, created_at desc);

alter table public.screenshot_notes enable row level security;

drop policy if exists screenshot_notes_select on public.screenshot_notes;
drop policy if exists screenshot_notes_insert on public.screenshot_notes;
drop policy if exists screenshot_notes_delete on public.screenshot_notes;

create policy screenshot_notes_select
  on public.screenshot_notes
  for select
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    or public.is_scoped_client(workspace_id, client_id)
    or (task_id is not null and public.can_read_task(task_id))
  );

create policy screenshot_notes_insert
  on public.screenshot_notes
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_workspace_member(workspace_id)
    and (
      public.is_workspace_staff(workspace_id)
      or public.is_scoped_client(workspace_id, client_id)
    )
  );

create policy screenshot_notes_delete
  on public.screenshot_notes
  for delete
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_workspace_staff(workspace_id)
  );

drop trigger if exists screenshot_notes_assert_workspace on public.screenshot_notes;
create trigger screenshot_notes_assert_workspace
  before insert or update of workspace_id, client_id, project_id, task_id, file_id on public.screenshot_notes
  for each row execute function public.assert_related_workspace();

create or replace function public.assert_related_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_workspace uuid;
  payload jsonb := to_jsonb(new);
begin
  if payload ? 'client_id' and payload->>'client_id' is not null then
    select workspace_id into related_workspace
    from public.clients
    where id = (payload->>'client_id')::uuid;

    if related_workspace is distinct from new.workspace_id then
      raise exception 'client_id must belong to the same workspace';
    end if;
  end if;

  if payload ? 'project_id' and payload->>'project_id' is not null then
    select workspace_id into related_workspace
    from public.projects
    where id = (payload->>'project_id')::uuid;

    if related_workspace is distinct from new.workspace_id then
      raise exception 'project_id must belong to the same workspace';
    end if;
  end if;

  if payload ? 'invoice_id' and payload->>'invoice_id' is not null then
    select workspace_id into related_workspace
    from public.invoices
    where id = (payload->>'invoice_id')::uuid;

    if related_workspace is distinct from new.workspace_id then
      raise exception 'invoice_id must belong to the same workspace';
    end if;
  end if;

  if payload ? 'task_id' and payload->>'task_id' is not null then
    select workspace_id into related_workspace
    from public.tasks
    where id = (payload->>'task_id')::uuid;

    if related_workspace is distinct from new.workspace_id then
      raise exception 'task_id must belong to the same workspace';
    end if;
  end if;

  if payload ? 'file_id' and payload->>'file_id' is not null then
    select workspace_id into related_workspace
    from public.files
    where id = (payload->>'file_id')::uuid;

    if related_workspace is distinct from new.workspace_id then
      raise exception 'file_id must belong to the same workspace';
    end if;
  end if;

  return new;
end;
$$;

grant select, insert, delete on public.screenshot_notes to authenticated;

-- Authors can remove the image they attached to a screenshot note.
drop policy if exists files_delete on public.files;
create policy files_delete
  on public.files
  for delete
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    or uploaded_by = auth.uid()
  );

drop policy if exists workspace_files_delete on storage.objects;
create policy workspace_files_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'workspace-files'
    and public.storage_workspace_id(name) is not null
    and (
      public.is_workspace_staff(public.storage_workspace_id(name))
      or owner = auth.uid()
    )
  );
