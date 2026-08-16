-- WorkFlow CRM — private file storage
-- Additive and safe to re-run. Does not drop existing tables.

-- ---------------------------------------------------------------------------
-- Attach files to invoices
-- ---------------------------------------------------------------------------

alter table public.files
  add column if not exists invoice_id uuid references public.invoices (id) on delete cascade;

create index if not exists files_invoice_id_idx on public.files (invoice_id);

-- ---------------------------------------------------------------------------
-- files_select includes invoice-scoped client portal access
-- ---------------------------------------------------------------------------

drop policy if exists files_select on public.files;

create policy files_select
  on public.files
  for select
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    or public.is_scoped_client(workspace_id, client_id)
    or exists (
      select 1
      from public.projects p
      where p.id = files.project_id
        and public.is_scoped_client(p.workspace_id, p.client_id)
    )
    or exists (
      select 1
      from public.tasks t
      where t.id = files.task_id
        and public.is_scoped_client(t.workspace_id, t.client_id)
    )
    or exists (
      select 1
      from public.invoices i
      where i.id = files.invoice_id
        and public.is_scoped_client(i.workspace_id, i.client_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Private storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workspace-files', 'workspace-files', false, 20971520, null)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

create or replace function public.storage_workspace_id(p_name text)
returns uuid
language sql
stable
set search_path = public
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
    else null
  end;
$$;

drop policy if exists workspace_files_select on storage.objects;
drop policy if exists workspace_files_insert on storage.objects;
drop policy if exists workspace_files_update on storage.objects;
drop policy if exists workspace_files_delete on storage.objects;

create policy workspace_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'workspace-files'
    and exists (
      select 1
      from public.files f
      where f.file_path = name
    )
  );

create policy workspace_files_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'workspace-files'
    and public.is_workspace_staff(public.storage_workspace_id(name))
  );

create policy workspace_files_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'workspace-files'
    and public.is_workspace_staff(public.storage_workspace_id(name))
  )
  with check (
    bucket_id = 'workspace-files'
    and public.is_workspace_staff(public.storage_workspace_id(name))
  );

create policy workspace_files_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'workspace-files'
    and public.is_workspace_staff(public.storage_workspace_id(name))
  );

grant execute on function public.storage_workspace_id(text) to authenticated;
