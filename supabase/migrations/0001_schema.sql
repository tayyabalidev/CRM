-- WorkFlow CRM — core multi-tenant schema
-- Safe to re-run: existing WorkFlow tables/types are dropped first.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Reset (so a partial previous run can be retried)
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists
  public.notifications,
  public.activity_logs,
  public.notes,
  public.files,
  public.payments,
  public.invoice_items,
  public.invoices,
  public.time_entries,
  public.task_comments,
  public.tasks,
  public.projects,
  public.workspace_members,
  public.clients,
  public.workspaces,
  public.profiles
cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_new_workspace() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.prevent_workspace_id_change() cascade;
drop function if exists public.sync_task_scope() cascade;
drop function if exists public.protect_workspace_owner() cascade;
drop function if exists public.is_workspace_member(uuid) cascade;
drop function if exists public.is_workspace_staff(uuid) cascade;
drop function if exists public.has_workspace_role(uuid, public.workspace_role[]) cascade;
drop function if exists public.workspace_client_id(uuid) cascade;
drop function if exists public.is_scoped_client(uuid, uuid) cascade;
drop function if exists public.can_read_profile(uuid) cascade;
drop function if exists public.can_read_task(uuid) cascade;
drop function if exists public.can_read_invoice(uuid) cascade;
drop function if exists public.can_write_invoice(uuid) cascade;
drop function if exists public.is_last_owner(uuid, uuid) cascade;
drop function if exists public.can_read_activity(uuid, text, uuid) cascade;

drop type if exists public.note_visibility cascade;
drop type if exists public.invoice_status cascade;
drop type if exists public.payment_method cascade;
drop type if exists public.task_status cascade;
drop type if exists public.priority cascade;
drop type if exists public.project_status cascade;
drop type if exists public.client_status cascade;
drop type if exists public.workspace_role cascade;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.workspace_role as enum ('owner', 'admin', 'member', 'client');
create type public.client_status as enum ('active', 'inactive', 'archived');
create type public.project_status as enum (
  'planning',
  'active',
  'on_hold',
  'completed',
  'cancelled'
);
create type public.priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_status as enum (
  'backlog',
  'todo',
  'in_progress',
  'review',
  'completed'
);
create type public.payment_method as enum (
  'cash',
  'bank_transfer',
  'paypal',
  'stripe',
  'wise',
  'other'
);
create type public.invoice_status as enum (
  'draft',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled'
);
create type public.note_visibility as enum ('private', 'team', 'client');

-- ---------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_workspace_id_change()
returns trigger
language plpgsql
as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'workspace_id cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  logo_url text,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  currency text not null default 'USD' check (char_length(currency) = 3),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index workspaces_slug_unique on public.workspaces (slug);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.workspace_role not null,
  -- Required when role = 'client' so portal users are scoped to one client.
  client_id uuid,
  created_at timestamptz not null default now(),
  constraint workspace_members_unique unique (workspace_id, user_id),
  constraint workspace_members_client_scope check (
    (role = 'client' and client_id is not null)
    or (role <> 'client' and client_id is null)
  )
);

comment on column public.workspace_members.client_id is
  'Required when role = client. Scopes portal users to one client inside the workspace.';

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  company text,
  email text,
  phone text,
  website text,
  address text,
  country text,
  notes text,
  status public.client_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspace_members
  add constraint workspace_members_client_id_fkey
  foreign key (client_id)
  references public.clients (id)
  on delete cascade;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  description text,
  status public.project_status not null default 'planning',
  priority public.priority not null default 'medium',
  budget numeric(12, 2) check (budget is null or budget >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  start_date date,
  due_date date,
  completed_at timestamptz,
  progress integer check (progress is null or (progress >= 0 and progress <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.priority not null default 'medium',
  assigned_to uuid references public.profiles (id) on delete set null,
  due_date timestamptz,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  description text,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  billable boolean not null default true,
  hourly_rate numeric(12, 2) check (hourly_rate is null or hourly_rate >= 0),
  created_at timestamptz not null default now(),
  constraint time_entries_range check (ended_at is null or ended_at >= started_at)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  invoice_number text not null,
  issue_date date not null default (timezone('utc', now()))::date,
  due_date date,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  tax numeric(12, 2) not null default 0 check (tax >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  status public.invoice_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_number_unique unique (workspace_id, invoice_number)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  quantity numeric(12, 2) not null default 1 check (quantity >= 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  invoice_id uuid references public.invoices (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  payment_method public.payment_method not null default 'other',
  payment_date date not null default (timezone('utc', now()))::date,
  reference text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_size bigint not null check (file_size >= 0),
  mime_type text,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  title text not null,
  content text,
  created_by uuid references public.profiles (id) on delete set null,
  visibility public.note_visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_parent_check check (client_id is not null or project_id is not null),
  constraint notes_client_visibility_check check (
    visibility <> 'client' or client_id is not null
  )
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Task scope sync (needs projects table)
-- ---------------------------------------------------------------------------

create or replace function public.sync_task_scope()
returns trigger
language plpgsql
as $$
declare
  project_row public.projects%rowtype;
begin
  if new.project_id is null then
    return new;
  end if;

  select * into project_row
  from public.projects
  where id = new.project_id;

  if not found then
    raise exception 'project not found';
  end if;

  new.workspace_id := project_row.workspace_id;

  if new.client_id is null then
    new.client_id := project_row.client_id;
  elsif new.client_id is distinct from project_row.client_id then
    raise exception 'task client_id must match the project client';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index workspace_members_user_id_idx on public.workspace_members (user_id);
create index workspace_members_workspace_id_idx on public.workspace_members (workspace_id);
create index workspace_members_client_id_idx
  on public.workspace_members (client_id)
  where client_id is not null;

create index clients_workspace_id_idx on public.clients (workspace_id);
create index clients_workspace_status_idx on public.clients (workspace_id, status);
create index clients_workspace_name_idx on public.clients (workspace_id, name);

create index projects_workspace_id_idx on public.projects (workspace_id);
create index projects_workspace_status_idx on public.projects (workspace_id, status);
create index projects_client_id_idx on public.projects (client_id);
create index projects_due_date_idx on public.projects (workspace_id, due_date);

create index tasks_workspace_id_idx on public.tasks (workspace_id);
create index tasks_workspace_status_idx on public.tasks (workspace_id, status);
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_client_id_idx on public.tasks (client_id);
create index tasks_assigned_to_idx on public.tasks (assigned_to);
create index tasks_due_date_idx on public.tasks (workspace_id, due_date);

create index task_comments_task_id_idx on public.task_comments (task_id);
create index task_comments_user_id_idx on public.task_comments (user_id);

create index time_entries_workspace_id_idx on public.time_entries (workspace_id);
create index time_entries_project_id_idx on public.time_entries (project_id);
create index time_entries_task_id_idx on public.time_entries (task_id);
create index time_entries_user_started_idx on public.time_entries (user_id, started_at desc);

create index invoices_workspace_id_idx on public.invoices (workspace_id);
create index invoices_workspace_status_idx on public.invoices (workspace_id, status);
create index invoices_client_id_idx on public.invoices (client_id);
create index invoices_project_id_idx on public.invoices (project_id);
create index invoices_due_date_idx on public.invoices (workspace_id, due_date);

create index invoice_items_invoice_id_idx on public.invoice_items (invoice_id);

create index payments_workspace_id_idx on public.payments (workspace_id);
create index payments_client_id_idx on public.payments (client_id);
create index payments_project_id_idx on public.payments (project_id);
create index payments_invoice_id_idx on public.payments (invoice_id);
create index payments_date_idx on public.payments (workspace_id, payment_date desc);

create index files_workspace_id_idx on public.files (workspace_id);
create index files_client_id_idx on public.files (client_id);
create index files_project_id_idx on public.files (project_id);
create index files_task_id_idx on public.files (task_id);

create index notes_workspace_id_idx on public.notes (workspace_id);
create index notes_client_id_idx on public.notes (client_id);
create index notes_project_id_idx on public.notes (project_id);
create index notes_visibility_idx on public.notes (workspace_id, visibility);

create index activity_logs_workspace_created_idx
  on public.activity_logs (workspace_id, created_at desc);
create index activity_logs_entity_idx
  on public.activity_logs (workspace_id, entity_type, entity_id);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (workspace_id, user_id, created_at desc)
  where read = false;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger task_comments_set_updated_at
  before update on public.task_comments
  for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create trigger clients_prevent_workspace_change
  before update on public.clients
  for each row execute function public.prevent_workspace_id_change();

create trigger projects_prevent_workspace_change
  before update on public.projects
  for each row execute function public.prevent_workspace_id_change();

create trigger tasks_prevent_workspace_change
  before update on public.tasks
  for each row execute function public.prevent_workspace_id_change();

create trigger time_entries_prevent_workspace_change
  before update on public.time_entries
  for each row execute function public.prevent_workspace_id_change();

create trigger invoices_prevent_workspace_change
  before update on public.invoices
  for each row execute function public.prevent_workspace_id_change();

create trigger payments_prevent_workspace_change
  before update on public.payments
  for each row execute function public.prevent_workspace_id_change();

create trigger files_prevent_workspace_change
  before update on public.files
  for each row execute function public.prevent_workspace_id_change();

create trigger notes_prevent_workspace_change
  before update on public.notes
  for each row execute function public.prevent_workspace_id_change();

create trigger activity_logs_prevent_workspace_change
  before update on public.activity_logs
  for each row execute function public.prevent_workspace_id_change();

create trigger notifications_prevent_workspace_change
  before update on public.notifications
  for each row execute function public.prevent_workspace_id_change();

create trigger tasks_sync_scope
  before insert or update of project_id, client_id, workspace_id on public.tasks
  for each row execute function public.sync_task_scope();

create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

create or replace function public.protect_workspace_owner()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'owner'
     and new.role is distinct from 'owner'
     and not exists (
       select 1
       from public.workspace_members
       where workspace_id = old.workspace_id
         and role = 'owner'
         and id <> old.id
     )
  then
    raise exception 'cannot demote the last workspace owner';
  end if;

  return new;
end;
$$;

create trigger workspace_members_protect_owner
  before update of role on public.workspace_members
  for each row execute function public.protect_workspace_owner();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
