-- WorkFlow CRM — onboarding profile/workspace write
-- Additive. Safe to re-run.
-- Fixes RLS 42501 on profiles during first-time setup (especially after
-- recreating tables without re-applying 0002 policies).

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.workspaces to authenticated;
grant select, insert, update, delete on table public.workspace_members to authenticated;

drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;

create policy profiles_insert
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy profiles_update
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists workspaces_insert on public.workspaces;

create policy workspaces_insert
  on public.workspaces
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists workspace_members_select on public.workspace_members;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_workspace_staff'
  ) then
    execute $policy$
      create policy workspace_members_select
        on public.workspace_members
        for select
        to authenticated
        using (
          public.is_workspace_staff(workspace_id)
          or user_id = auth.uid()
        )
    $policy$;
  else
    execute $policy$
      create policy workspace_members_select
        on public.workspace_members
        for select
        to authenticated
        using (user_id = auth.uid())
    $policy$;
  end if;
end
$$;

drop policy if exists workspaces_select on public.workspaces;

create policy workspaces_select
  on public.workspaces
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = workspaces.id
        and m.user_id = auth.uid()
    )
  );

create or replace function public.complete_onboarding(
  p_full_name text,
  p_workspace_name text,
  p_workspace_slug text,
  p_currency text,
  p_timezone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  wid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1
    from public.workspace_members
    where user_id = uid
    limit 1
  ) then
    select workspace_id
      into wid
      from public.workspace_members
     where user_id = uid
     order by created_at
     limit 1;
    return wid;
  end if;

  insert into public.profiles (id, full_name, timezone)
  values (uid, p_full_name, p_timezone)
  on conflict (id) do update
    set full_name = excluded.full_name,
        timezone = excluded.timezone;

  select id
    into wid
    from public.workspaces
   where owner_id = uid
   order by created_at
   limit 1;

  if wid is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (wid, uid, 'owner')
    on conflict (workspace_id, user_id) do nothing;
    return wid;
  end if;

  insert into public.workspaces (name, slug, owner_id, currency, timezone)
  values (
    p_workspace_name,
    p_workspace_slug,
    uid,
    p_currency,
    p_timezone
  )
  returning id into wid;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (wid, uid, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return wid;
end;
$$;

revoke all on function public.complete_onboarding(text, text, text, text, text) from public;
grant execute on function public.complete_onboarding(text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
