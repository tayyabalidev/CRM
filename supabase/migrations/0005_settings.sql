-- WorkFlow CRM — settings (notification prefs + staff invite links)
-- Additive and safe to re-run. Does not drop existing tables.

alter table public.profiles
  add column if not exists notify_in_app boolean not null default true;

alter table public.profiles
  add column if not exists notify_email boolean not null default false;

comment on column public.profiles.notify_in_app is
  'Show in-app notification alerts when they exist.';
comment on column public.profiles.notify_email is
  'Email alerts are stored for later. No paid email provider is used yet.';

-- ---------------------------------------------------------------------------
-- Staff invite links (no paid email provider)
-- ---------------------------------------------------------------------------

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  role public.workspace_role not null,
  token uuid not null default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint workspace_invites_token_unique unique (token),
  constraint workspace_invites_staff_role check (role in ('admin', 'member'))
);

create index if not exists workspace_invites_workspace_id_idx on public.workspace_invites (workspace_id);

alter table public.workspace_invites enable row level security;

revoke all on public.workspace_invites from anon, public;
grant select, insert, delete on public.workspace_invites to authenticated;

drop policy if exists workspace_invites_select on public.workspace_invites;
drop policy if exists workspace_invites_insert on public.workspace_invites;
drop policy if exists workspace_invites_delete on public.workspace_invites;

create policy workspace_invites_select
  on public.workspace_invites
  for select
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy workspace_invites_insert
  on public.workspace_invites
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      (
        role = 'member'
        and public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
      )
      or (
        role = 'admin'
        and public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[])
      )
    )
  );

create policy workspace_invites_delete
  on public.workspace_invites
  for delete
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

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

  select id
    into existing_id
    from public.workspace_members
   where user_id = auth.uid()
   limit 1;

  if existing_id is not null then
    return jsonb_build_object('ok', false, 'error', 'already_member');
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, client_id)
  values (invite.workspace_id, auth.uid(), invite.role, null);

  update public.workspace_invites
     set accepted_at = now(),
         accepted_by = auth.uid()
   where id = invite.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.accept_workspace_invite(uuid) from public;
grant execute on function public.accept_workspace_invite(uuid) to authenticated;

create or replace function public.preview_workspace_invite(p_token uuid)
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
    i.role,
    i.expires_at,
    i.accepted_at
    into invite_row
    from public.workspace_invites i
    join public.workspaces w on w.id = i.workspace_id
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
    'role', invite_row.role
  );
end;
$$;

revoke all on function public.preview_workspace_invite(uuid) from public;
grant execute on function public.preview_workspace_invite(uuid) to authenticated;
