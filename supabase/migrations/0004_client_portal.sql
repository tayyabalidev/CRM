-- WorkFlow CRM — client portal
-- Additive and safe to re-run. Does not drop existing tables.

-- ---------------------------------------------------------------------------
-- Clients cannot see draft invoices (internal until sent)
-- ---------------------------------------------------------------------------

create or replace function public.can_read_invoice(p_invoice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invoices i
    where i.id = p_invoice_id
      and (
        public.is_workspace_staff(i.workspace_id)
        or (
          public.is_scoped_client(i.workspace_id, i.client_id)
          and i.status <> 'draft'
        )
      )
  );
$$;

create or replace function public.can_read_activity(
  p_workspace_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  scoped uuid;
begin
  if public.is_workspace_staff(p_workspace_id) then
    return true;
  end if;

  scoped := public.workspace_client_id(p_workspace_id);
  if scoped is null then
    return false;
  end if;

  return case p_entity_type
    when 'client' then p_entity_id = scoped
    when 'project' then exists (
      select 1 from public.projects p
      where p.id = p_entity_id and p.client_id = scoped
    )
    when 'task' then exists (
      select 1 from public.tasks t
      where t.id = p_entity_id and t.client_id = scoped
    )
    when 'invoice' then exists (
      select 1 from public.invoices i
      where i.id = p_entity_id
        and i.client_id = scoped
        and i.status <> 'draft'
    )
    when 'payment' then exists (
      select 1 from public.payments pay
      where pay.id = p_entity_id and pay.client_id = scoped
    )
    when 'file' then exists (
      select 1 from public.files f
      where f.id = p_entity_id
        and f.client_id = scoped
        and (
          f.invoice_id is null
          or exists (
            select 1 from public.invoices i
            where i.id = f.invoice_id and i.status <> 'draft'
          )
        )
    )
    when 'note' then exists (
      select 1 from public.notes n
      where n.id = p_entity_id
        and n.client_id = scoped
        and n.visibility = 'client'
    )
    else false
  end;
end;
$$;

drop policy if exists invoices_select on public.invoices;

create policy invoices_select
  on public.invoices
  for select
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    or (
      public.is_scoped_client(workspace_id, client_id)
      and status <> 'draft'
    )
  );

drop policy if exists files_select on public.files;

create policy files_select
  on public.files
  for select
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    or (
      (
        public.is_scoped_client(workspace_id, client_id)
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
            and i.status <> 'draft'
        )
      )
      and (
        invoice_id is null
        or exists (
          select 1
          from public.invoices i
          where i.id = files.invoice_id
            and i.status <> 'draft'
        )
      )
    )
  );

-- Clients cannot read staff profile rows (assignee names, team directory).
create or replace function public.can_read_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id = auth.uid()
    or exists (
      select 1
      from public.workspace_members me
      join public.workspace_members them
        on them.workspace_id = me.workspace_id
      where me.user_id = auth.uid()
        and them.user_id = p_user_id
        and me.role in ('owner', 'admin', 'member')
    );
$$;

-- ---------------------------------------------------------------------------
-- Portal invite links (no paid email provider)
-- ---------------------------------------------------------------------------

create table if not exists public.portal_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint portal_invites_token_unique unique (token)
);

create index if not exists portal_invites_workspace_id_idx on public.portal_invites (workspace_id);
create index if not exists portal_invites_client_id_idx on public.portal_invites (client_id);

alter table public.portal_invites enable row level security;

revoke all on public.portal_invites from anon, public;
grant select, insert, delete on public.portal_invites to authenticated;

drop policy if exists portal_invites_select on public.portal_invites;
drop policy if exists portal_invites_insert on public.portal_invites;
drop policy if exists portal_invites_delete on public.portal_invites;

create policy portal_invites_select
  on public.portal_invites
  for select
  to authenticated
  using (public.is_workspace_staff(workspace_id));

create policy portal_invites_insert
  on public.portal_invites
  for insert
  to authenticated
  with check (
    public.is_workspace_staff(workspace_id)
    and created_by = auth.uid()
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.workspace_id = portal_invites.workspace_id
    )
  );

create policy portal_invites_delete
  on public.portal_invites
  for delete
  to authenticated
  using (public.is_workspace_staff(workspace_id));

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

  select *
    into invite
    from public.portal_invites
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

  select role, client_id
    into existing_role, existing_client
    from public.workspace_members
   where workspace_id = invite.workspace_id
     and user_id = auth.uid();

  if existing_role is not null then
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

  insert into public.workspace_members (workspace_id, user_id, role, client_id)
  values (invite.workspace_id, auth.uid(), 'client', invite.client_id);

  update public.portal_invites
     set accepted_at = now(),
         accepted_by = auth.uid()
   where id = invite.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.accept_client_portal_invite(uuid) from public;
grant execute on function public.accept_client_portal_invite(uuid) to authenticated;

create or replace function public.preview_client_portal_invite(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  invite_row record;
begin
  select
    w.name as workspace_name,
    c.name as client_name,
    i.expires_at,
    i.accepted_at
    into invite_row
    from public.portal_invites i
    join public.workspaces w on w.id = i.workspace_id
    join public.clients c on c.id = i.client_id
   where i.token = p_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if invite_row.accepted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'used');
  end if;

  if invite_row.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  return jsonb_build_object(
    'ok', true,
    'workspaceName', invite_row.workspace_name,
    'clientName', invite_row.client_name
  );
end;
$$;

revoke all on function public.preview_client_portal_invite(uuid) from public;
grant execute on function public.preview_client_portal_invite(uuid) to authenticated;
