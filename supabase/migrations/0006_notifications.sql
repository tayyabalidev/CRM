-- WorkFlow CRM — in-app notifications (links + dedupe for deadline alerts)
-- Additive. Do not re-run 0001.

alter table public.notifications
  add column if not exists link text;

alter table public.notifications
  add column if not exists entity_type text;

alter table public.notifications
  add column if not exists entity_id uuid;

alter table public.notifications
  add column if not exists dedupe_key text;

comment on column public.notifications.link is
  'Optional in-app path to open when the notification is clicked.';
comment on column public.notifications.dedupe_key is
  'Stable key so deadline alerts are created once per entity/due date.';

create unique index if not exists notifications_user_dedupe_idx
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;
