-- WorkFlow CRM — row level security
-- Run after 0001_schema.sql. Tenant isolation is enforced here, not in the UI.

-- ---------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER, bypass RLS to avoid recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_staff(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
  );
$$;

create or replace function public.has_workspace_role(
  p_workspace_id uuid,
  p_roles public.workspace_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and role = any (p_roles)
  );
$$;

create or replace function public.workspace_client_id(p_workspace_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id
  from public.workspace_members
  where workspace_id = p_workspace_id
    and user_id = auth.uid()
    and role = 'client'
  limit 1;
$$;

create or replace function public.is_scoped_client(p_workspace_id uuid, p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_client_id is not null
    and exists (
      select 1
      from public.workspace_members
      where workspace_id = p_workspace_id
        and user_id = auth.uid()
        and role = 'client'
        and client_id = p_client_id
    );
$$;

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
    )
    or exists (
      select 1
      from public.workspace_members me
      join public.tasks t
        on t.workspace_id = me.workspace_id
       and t.client_id = me.client_id
       and t.assigned_to = p_user_id
      where me.user_id = auth.uid()
        and me.role = 'client'
    );
$$;

create or replace function public.can_read_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = p_task_id
      and (
        public.is_workspace_staff(t.workspace_id)
        or public.is_scoped_client(t.workspace_id, t.client_id)
      )
  );
$$;

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
        or public.is_scoped_client(i.workspace_id, i.client_id)
      )
  );
$$;

create or replace function public.can_write_invoice(p_invoice_id uuid)
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
      and public.is_workspace_staff(i.workspace_id)
  );
$$;

create or replace function public.is_last_owner(p_workspace_id uuid, p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where id = p_member_id
      and workspace_id = p_workspace_id
      and role = 'owner'
  )
  and not exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and role = 'owner'
      and id <> p_member_id
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
      where i.id = p_entity_id and i.client_id = scoped
    )
    when 'payment' then exists (
      select 1 from public.payments pay
      where pay.id = p_entity_id and pay.client_id = scoped
    )
    when 'file' then exists (
      select 1 from public.files f
      where f.id = p_entity_id and f.client_id = scoped
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

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_staff(uuid) from public;
revoke all on function public.has_workspace_role(uuid, public.workspace_role[]) from public;
revoke all on function public.workspace_client_id(uuid) from public;
revoke all on function public.is_scoped_client(uuid, uuid) from public;
revoke all on function public.can_read_profile(uuid) from public;
revoke all on function public.can_read_task(uuid) from public;
revoke all on function public.can_read_invoice(uuid) from public;
revoke all on function public.can_write_invoice(uuid) from public;
revoke all on function public.is_last_owner(uuid, uuid) from public;
revoke all on function public.can_read_activity(uuid, text, uuid) from public;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_staff(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;
grant execute on function public.workspace_client_id(uuid) to authenticated;
grant execute on function public.is_scoped_client(uuid, uuid) to authenticated;
grant execute on function public.can_read_profile(uuid) to authenticated;
grant execute on function public.can_read_task(uuid) to authenticated;
grant execute on function public.can_read_invoice(uuid) to authenticated;
grant execute on function public.can_write_invoice(uuid) to authenticated;
grant execute on function public.is_last_owner(uuid, uuid) to authenticated;
grant execute on function public.can_read_activity(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.time_entries enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.files enable row level security;
alter table public.notes enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;

-- ---------------------------------------------------------------------------
-- Table grants: authenticated only. anon has no direct table access.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, public;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Drop existing policies (so 0002 can be re-run)
-- ---------------------------------------------------------------------------

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists workspaces_select on public.workspaces;
drop policy if exists workspaces_insert on public.workspaces;
drop policy if exists workspaces_update on public.workspaces;
drop policy if exists workspaces_delete on public.workspaces;
drop policy if exists workspace_members_select on public.workspace_members;
drop policy if exists workspace_members_insert on public.workspace_members;
drop policy if exists workspace_members_update on public.workspace_members;
drop policy if exists workspace_members_delete on public.workspace_members;
drop policy if exists clients_select on public.clients;
drop policy if exists clients_insert on public.clients;
drop policy if exists clients_update on public.clients;
drop policy if exists clients_delete on public.clients;
drop policy if exists projects_select on public.projects;
drop policy if exists projects_insert on public.projects;
drop policy if exists projects_update on public.projects;
drop policy if exists projects_delete on public.projects;
drop policy if exists tasks_select on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;
drop policy if exists task_comments_select on public.task_comments;
drop policy if exists task_comments_insert on public.task_comments;
drop policy if exists task_comments_update on public.task_comments;
drop policy if exists task_comments_delete on public.task_comments;
drop policy if exists time_entries_select on public.time_entries;
drop policy if exists time_entries_insert on public.time_entries;
drop policy if exists time_entries_update on public.time_entries;
drop policy if exists time_entries_delete on public.time_entries;
drop policy if exists invoices_select on public.invoices;
drop policy if exists invoices_insert on public.invoices;
drop policy if exists invoices_update on public.invoices;
drop policy if exists invoices_delete on public.invoices;
drop policy if exists invoice_items_select on public.invoice_items;
drop policy if exists invoice_items_insert on public.invoice_items;
drop policy if exists invoice_items_update on public.invoice_items;
drop policy if exists invoice_items_delete on public.invoice_items;
drop policy if exists payments_select on public.payments;
drop policy if exists payments_insert on public.payments;
drop policy if exists payments_update on public.payments;
drop policy if exists payments_delete on public.payments;
drop policy if exists files_select on public.files;
drop policy if exists files_insert on public.files;
drop policy if exists files_update on public.files;
drop policy if exists files_delete on public.files;
drop policy if exists notes_select on public.notes;
drop policy if exists notes_insert on public.notes;
drop policy if exists notes_update on public.notes;
drop policy if exists notes_delete on public.notes;
drop policy if exists activity_logs_select on public.activity_logs;
drop policy if exists activity_logs_insert on public.activity_logs;
drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_insert on public.notifications;
drop policy if exists notifications_update on public.notifications;
drop policy if exists notifications_delete on public.notifications;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy profiles_select
  on public.profiles
  for select
  to authenticated
  using (public.can_read_profile(id));

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

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------

create policy workspaces_select
  on public.workspaces
  for select
  to authenticated
  using (public.is_workspace_member(id));

create policy workspaces_insert
  on public.workspaces
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy workspaces_update
  on public.workspaces
  for update
  to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));

create policy workspaces_delete
  on public.workspaces
  for delete
  to authenticated
  using (public.has_workspace_role(id, array['owner']::public.workspace_role[]));

-- ---------------------------------------------------------------------------
-- workspace_members
-- ---------------------------------------------------------------------------

create policy workspace_members_select
  on public.workspace_members
  for select
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    or user_id = auth.uid()
  );

create policy workspace_members_insert
  on public.workspace_members
  for insert
  to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
  );

create policy workspace_members_update
  on public.workspace_members
  for update
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy workspace_members_delete
  on public.workspace_members
  for delete
  to authenticated
  using (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    and not public.is_last_owner(workspace_id, id)
  );

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------

create policy clients_select
  on public.clients
  for select
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    or public.is_scoped_client(workspace_id, id)
  );

create policy clients_insert
  on public.clients
  for insert
  to authenticated
  with check (public.is_workspace_staff(workspace_id));

create policy clients_update
  on public.clients
  for update
  to authenticated
  using (public.is_workspace_staff(workspace_id))
  with check (public.is_workspace_staff(workspace_id));

create policy clients_delete
  on public.clients
  for delete
  to authenticated
  using (public.is_workspace_staff(workspace_id));

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

create policy projects_select
  on public.projects
  for select
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    or public.is_scoped_client(workspace_id, client_id)
  );

create policy projects_insert
  on public.projects
  for insert
  to authenticated
  with check (public.is_workspace_staff(workspace_id));

create policy projects_update
  on public.projects
  for update
  to authenticated
  using (public.is_workspace_staff(workspace_id))
  with check (public.is_workspace_staff(workspace_id));

create policy projects_delete
  on public.projects
  for delete
  to authenticated
  using (public.is_workspace_staff(workspace_id));

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

create policy tasks_select
  on public.tasks
  for select
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    or public.is_scoped_client(workspace_id, client_id)
  );

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

create policy tasks_update
  on public.tasks
  for update
  to authenticated
  using (public.is_workspace_staff(workspace_id))
  with check (public.is_workspace_staff(workspace_id));

create policy tasks_delete
  on public.tasks
  for delete
  to authenticated
  using (public.is_workspace_staff(workspace_id));

-- ---------------------------------------------------------------------------
-- task_comments
-- ---------------------------------------------------------------------------

create policy task_comments_select
  on public.task_comments
  for select
  to authenticated
  using (public.can_read_task(task_id));

create policy task_comments_insert
  on public.task_comments
  for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_read_task(task_id));

create policy task_comments_update
  on public.task_comments
  for update
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.tasks t
      where t.id = task_id
        and public.is_workspace_staff(t.workspace_id)
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1
      from public.tasks t
      where t.id = task_id
        and public.is_workspace_staff(t.workspace_id)
    )
  );

create policy task_comments_delete
  on public.task_comments
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.tasks t
      where t.id = task_id
        and public.is_workspace_staff(t.workspace_id)
    )
  );

-- ---------------------------------------------------------------------------
-- time_entries (staff only — hidden from client portal)
-- ---------------------------------------------------------------------------

create policy time_entries_select
  on public.time_entries
  for select
  to authenticated
  using (public.is_workspace_staff(workspace_id));

create policy time_entries_insert
  on public.time_entries
  for insert
  to authenticated
  with check (public.is_workspace_staff(workspace_id) and user_id = auth.uid());

create policy time_entries_update
  on public.time_entries
  for update
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    and (
      user_id = auth.uid()
      or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    )
  )
  with check (
    public.is_workspace_staff(workspace_id)
    and (
      user_id = auth.uid()
      or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    )
  );

create policy time_entries_delete
  on public.time_entries
  for delete
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    and (
      user_id = auth.uid()
      or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------

create policy invoices_select
  on public.invoices
  for select
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    or public.is_scoped_client(workspace_id, client_id)
  );

create policy invoices_insert
  on public.invoices
  for insert
  to authenticated
  with check (public.is_workspace_staff(workspace_id));

create policy invoices_update
  on public.invoices
  for update
  to authenticated
  using (public.is_workspace_staff(workspace_id))
  with check (public.is_workspace_staff(workspace_id));

create policy invoices_delete
  on public.invoices
  for delete
  to authenticated
  using (public.is_workspace_staff(workspace_id));

-- ---------------------------------------------------------------------------
-- invoice_items
-- ---------------------------------------------------------------------------

create policy invoice_items_select
  on public.invoice_items
  for select
  to authenticated
  using (public.can_read_invoice(invoice_id));

create policy invoice_items_insert
  on public.invoice_items
  for insert
  to authenticated
  with check (public.can_write_invoice(invoice_id));

create policy invoice_items_update
  on public.invoice_items
  for update
  to authenticated
  using (public.can_write_invoice(invoice_id))
  with check (public.can_write_invoice(invoice_id));

create policy invoice_items_delete
  on public.invoice_items
  for delete
  to authenticated
  using (public.can_write_invoice(invoice_id));

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------

create policy payments_select
  on public.payments
  for select
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    or public.is_scoped_client(workspace_id, client_id)
  );

create policy payments_insert
  on public.payments
  for insert
  to authenticated
  with check (public.is_workspace_staff(workspace_id));

create policy payments_update
  on public.payments
  for update
  to authenticated
  using (public.is_workspace_staff(workspace_id))
  with check (public.is_workspace_staff(workspace_id));

create policy payments_delete
  on public.payments
  for delete
  to authenticated
  using (public.is_workspace_staff(workspace_id));

-- ---------------------------------------------------------------------------
-- files
-- ---------------------------------------------------------------------------

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
  );

create policy files_insert
  on public.files
  for insert
  to authenticated
  with check (public.is_workspace_staff(workspace_id));

create policy files_update
  on public.files
  for update
  to authenticated
  using (public.is_workspace_staff(workspace_id))
  with check (public.is_workspace_staff(workspace_id));

create policy files_delete
  on public.files
  for delete
  to authenticated
  using (public.is_workspace_staff(workspace_id));

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------

create policy notes_select
  on public.notes
  for select
  to authenticated
  using (
    (
      public.is_workspace_staff(workspace_id)
      and (
        visibility in ('team', 'client')
        or created_by = auth.uid()
      )
    )
    or (
      visibility = 'client'
      and public.is_scoped_client(workspace_id, client_id)
    )
  );

create policy notes_insert
  on public.notes
  for insert
  to authenticated
  with check (
    public.is_workspace_staff(workspace_id)
    and (created_by is null or created_by = auth.uid())
  );

create policy notes_update
  on public.notes
  for update
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    and (
      created_by = auth.uid()
      or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    )
  )
  with check (
    public.is_workspace_staff(workspace_id)
    and (
      created_by = auth.uid()
      or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    )
  );

create policy notes_delete
  on public.notes
  for delete
  to authenticated
  using (
    public.is_workspace_staff(workspace_id)
    and (
      created_by = auth.uid()
      or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- activity_logs
-- ---------------------------------------------------------------------------

create policy activity_logs_select
  on public.activity_logs
  for select
  to authenticated
  using (public.can_read_activity(workspace_id, entity_type, entity_id));

create policy activity_logs_insert
  on public.activity_logs
  for insert
  to authenticated
  with check (public.is_workspace_staff(workspace_id));

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

create policy notifications_select
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy notifications_insert
  on public.notifications
  for insert
  to authenticated
  with check (
    public.is_workspace_staff(workspace_id)
    and exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = notifications.workspace_id
        and wm.user_id = notifications.user_id
    )
  );

create policy notifications_update
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_delete
  on public.notifications
  for delete
  to authenticated
  using (user_id = auth.uid());
