-- WorkFlow CRM — security hardening (Phase 21)
-- Additive. Do not re-run 0001.
-- Fixes storage cross-tenant reads, membership privilege escalation,
-- invite race conditions, and same-workspace foreign key integrity.

-- ---------------------------------------------------------------------------
-- Storage: SELECT must match workspace + readable files row
-- ---------------------------------------------------------------------------

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]
where id = 'workspace-files';

drop policy if exists workspace_files_select on storage.objects;

create policy workspace_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'workspace-files'
    and public.storage_workspace_id(name) is not null
    and public.is_workspace_member(public.storage_workspace_id(name))
    and exists (
      select 1
      from public.files f
      where f.file_path = name
        and f.workspace_id = public.storage_workspace_id(name)
    )
  );

create or replace function public.enforce_file_path_workspace()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.file_path is null
     or new.file_path not like (new.workspace_id::text || '/%')
  then
    raise exception 'file_path must start with workspace_id';
  end if;

  return new;
end;
$$;

drop trigger if exists files_enforce_path_workspace on public.files;
create trigger files_enforce_path_workspace
  before insert or update of file_path, workspace_id on public.files
  for each row execute function public.enforce_file_path_workspace();

-- ---------------------------------------------------------------------------
-- Membership: block privilege escalation via direct PostgREST writes
-- ---------------------------------------------------------------------------

create or replace function public.enforce_member_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_owner boolean;
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'cannot change workspace member user_id';
  end if;

  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'cannot move workspace membership';
  end if;

  if new.client_id is distinct from old.client_id then
    raise exception 'cannot change workspace member client_id';
  end if;

  if new.role = 'owner' and old.role is distinct from 'owner' then
    raise exception 'cannot promote a member to owner';
  end if;

  if new.role = 'client' and old.role is distinct from 'client' then
    raise exception 'cannot change a member role to client';
  end if;

  if new.role = 'admin' and old.role is distinct from 'admin' then
    select exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = new.workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    ) into actor_is_owner;

    if auth.uid() is not null and not coalesce(actor_is_owner, false) then
      raise exception 'only the workspace owner can assign admin';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists workspace_members_enforce_roles on public.workspace_members;
create trigger workspace_members_enforce_roles
  before update on public.workspace_members
  for each row execute function public.enforce_member_role_changes();

drop policy if exists workspace_members_insert on public.workspace_members;
drop policy if exists workspace_members_update on public.workspace_members;

create policy workspace_members_insert
  on public.workspace_members
  for insert
  to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    and role in ('admin', 'member')
    and client_id is null
    and (
      role = 'member'
      or public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[])
    )
  );

create policy workspace_members_update
  on public.workspace_members
  for update
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    and role in ('admin', 'member')
    and client_id is null
    and (
      role = 'member'
      or public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[])
    )
  );

create or replace function public.protect_workspace_owner_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'cannot change workspace owner_id directly';
  end if;

  return new;
end;
$$;

drop trigger if exists workspaces_protect_owner_id on public.workspaces;
create trigger workspaces_protect_owner_id
  before update of owner_id on public.workspaces
  for each row execute function public.protect_workspace_owner_column();

-- ---------------------------------------------------------------------------
-- Same-workspace integrity for related rows
-- ---------------------------------------------------------------------------

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

  return new;
end;
$$;

drop trigger if exists projects_assert_workspace on public.projects;
create trigger projects_assert_workspace
  before insert or update of workspace_id, client_id on public.projects
  for each row execute function public.assert_related_workspace();

drop trigger if exists invoices_assert_workspace on public.invoices;
create trigger invoices_assert_workspace
  before insert or update of workspace_id, client_id, project_id on public.invoices
  for each row execute function public.assert_related_workspace();

drop trigger if exists payments_assert_workspace on public.payments;
create trigger payments_assert_workspace
  before insert or update of workspace_id, client_id, project_id, invoice_id on public.payments
  for each row execute function public.assert_related_workspace();

drop trigger if exists files_assert_workspace on public.files;
create trigger files_assert_workspace
  before insert or update of workspace_id, client_id, project_id, task_id, invoice_id on public.files
  for each row execute function public.assert_related_workspace();

drop trigger if exists notes_assert_workspace on public.notes;
create trigger notes_assert_workspace
  before insert or update of workspace_id, client_id, project_id on public.notes
  for each row execute function public.assert_related_workspace();

-- ---------------------------------------------------------------------------
-- Invite accept: claim token atomically (single-use)
-- ---------------------------------------------------------------------------

create or replace function public.accept_workspace_invite(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.workspace_invites%rowtype;
  existing_id uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in');
  end if;

  update public.workspace_invites
     set accepted_at = now(),
         accepted_by = auth.uid()
   where token = p_token
     and accepted_at is null
     and expires_at > now()
  returning * into invite;

  if not found then
    select *
      into invite
      from public.workspace_invites
     where token = p_token;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;

    if invite.accepted_at is not null then
      return jsonb_build_object('ok', false, 'error', 'used');
    end if;

    if invite.expires_at <= now() then
      return jsonb_build_object('ok', false, 'error', 'expired');
    end if;

    return jsonb_build_object('ok', false, 'error', 'used');
  end if;

  select id
    into existing_id
    from public.workspace_members
   where user_id = auth.uid()
   limit 1;

  if existing_id is not null then
    update public.workspace_invites
       set accepted_at = null,
           accepted_by = null
     where id = invite.id;
    return jsonb_build_object('ok', false, 'error', 'already_member');
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, client_id)
  values (invite.workspace_id, auth.uid(), invite.role, null);

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.accept_client_portal_invite(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.portal_invites%rowtype;
  existing_role public.workspace_role;
  existing_client uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'sign_in');
  end if;

  select role, client_id
    into existing_role, existing_client
    from public.workspace_members
   where workspace_id = (
           select workspace_id from public.portal_invites where token = p_token
         )
     and user_id = auth.uid();

  if existing_role is not null then
    select * into invite from public.portal_invites where token = p_token;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;

    if existing_role = 'client' and existing_client = invite.client_id then
      update public.portal_invites
         set accepted_at = now(),
             accepted_by = auth.uid()
       where id = invite.id
         and accepted_at is null;
      return jsonb_build_object('ok', true);
    end if;

    return jsonb_build_object('ok', false, 'error', 'already_member');
  end if;

  update public.portal_invites
     set accepted_at = now(),
         accepted_by = auth.uid()
   where token = p_token
     and accepted_at is null
     and expires_at > now()
  returning * into invite;

  if not found then
    select * into invite from public.portal_invites where token = p_token;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;

    if invite.accepted_at is not null then
      return jsonb_build_object('ok', false, 'error', 'used');
    end if;

    if invite.expires_at <= now() then
      return jsonb_build_object('ok', false, 'error', 'expired');
    end if;

    return jsonb_build_object('ok', false, 'error', 'used');
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, client_id)
  values (invite.workspace_id, auth.uid(), 'client', invite.client_id);

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Notification links: relative in-app paths only (when column exists)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'link'
  ) then
    update public.notifications
       set link = null
     where link is not null
       and (
         link !~ '^/[^/]'
         or link like '//%'
         or position('://' in link) > 0
       );

    begin
      alter table public.notifications
        drop constraint if exists notifications_link_relative_check;
    exception
      when undefined_object then null;
    end;

    alter table public.notifications
      add constraint notifications_link_relative_check
      check (
        link is null
        or (
          link ~ '^/[^/]'
          and link not like '//%'
          and position('://' in link) = 0
        )
      );
  end if;
end $$;
