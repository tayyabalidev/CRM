-- WorkFlow CRM — client portal uploads (Phase 27)
-- Additive migration.

-- Allow client-scoped users to create file rows for their own client.
drop policy if exists files_insert on public.files;

create policy files_insert
  on public.files
  for insert
  to authenticated
  with check (
    public.is_workspace_staff(workspace_id)
    or public.is_scoped_client(workspace_id, client_id)
  );

-- Allow workspace members (staff + scoped clients) to upload objects into
-- workspace-prefixed storage paths. Table-level files_insert policy still
-- enforces client scope for metadata rows.
drop policy if exists workspace_files_insert on storage.objects;

create policy workspace_files_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'workspace-files'
    and public.storage_workspace_id(name) is not null
    and public.is_workspace_member(public.storage_workspace_id(name))
  );
