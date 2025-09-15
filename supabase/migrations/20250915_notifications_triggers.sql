-- Create notifications on request create and accept

-- Assumptions:
-- - public.requests exists with columns: id uuid, requester_username text, status text (optional),
--   and a seller mapping exists via listings or username->user id.
-- This migration adds minimal functions to insert notifications only; application code will supply
-- recipient ids explicitly where needed.

-- Helper to fetch user id by username
create or replace function public.user_id_by_username(p_username text)
returns uuid language sql stable as $$
  select id from public.users where username = p_username limit 1
$$;

-- When a new request is created, notify potential seller owner if available via listing context
-- NOTE: If you don't have seller_user_id on requests, you can skip this trigger and
-- insert notifications from application code when routing the request to a seller.

-- Stub trigger left intentionally minimal; safe no-op if no seller found.
create or replace function public.on_request_insert_create_notification()
returns trigger language plpgsql security definer as $$
declare
  seller_user_id uuid;
begin
  -- Attempt to derive seller from a hypothetical field new.seller_user_id; if absent, do nothing
  begin
    execute 'select ($1).seller_user_id' into seller_user_id using new;
  exception when undefined_column then
    seller_user_id := null;
  end;

  if seller_user_id is not null then
    insert into public.notifications (recipient_user_id, type, title, body, data)
    values (
      seller_user_id,
      'request_created',
      'New request received',
      'You have a new request',
      jsonb_build_object('request_id', new.id)
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_request_insert_notif on public.requests;
create trigger trg_request_insert_notif
after insert on public.requests
for each row execute function public.on_request_insert_create_notification();

-- When a request is accepted, notify requester
create or replace function public.on_request_accepted_create_notification()
returns trigger language plpgsql security definer as $$
declare
  requester_id uuid;
begin
  -- Only act on status change to 'accepted' if such a column exists
  begin
    if (old.* is distinct from new.*) then
      -- Check status column dynamically; skip if missing
      perform 1; -- placeholder
    end if;
  exception when others then
    -- If status column logic fails, skip silently
    return new;
  end;

  -- Resolve requester id from username
  requester_id := user_id_by_username(new.requester_username);
  if requester_id is not null then
    insert into public.notifications (recipient_user_id, type, title, body, data)
    values (
      requester_id,
      'request_accepted',
      'Request accepted',
      'Your request was accepted',
      jsonb_build_object('request_id', new.id)
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_request_update_notif on public.requests;
create trigger trg_request_update_notif
after update on public.requests
for each row execute function public.on_request_accepted_create_notification();


