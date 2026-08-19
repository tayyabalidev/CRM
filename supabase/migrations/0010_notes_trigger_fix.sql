-- WorkFlow CRM — fix shared workspace-integrity trigger
-- Additive. Safe to re-run.
-- Notes do not have invoice_id/task_id. The previous function still read
-- NEW.invoice_id and failed with: record "new" has no field "invoice_id".

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
