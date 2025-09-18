-- Minimal, reusable unification for pings: introduce target_id + updated_at, 
-- add counter-cache triggers, and update RPC to use new fields.

begin;

-- 1) Schema adjustments on pings ------------------------------------------------
alter table public.pings
  add column if not exists item_type text check (item_type in ('listing','request')),
  add column if not exists target_id uuid,
  add column if not exists updated_at timestamptz default timezone('utc', now());

-- Backfill item_type and target_id from legacy columns if present
do $$
declare
  has_listing_id boolean := false;
  has_request_id boolean := false;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pings' and column_name='listing_id'
  ) into has_listing_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pings' and column_name='request_id'
  ) into has_request_id;

  if has_listing_id then
    execute 'update public.pings set item_type = coalesce(item_type, ''listing'') where item_type is null and listing_id is not null';
    execute 'update public.pings set target_id = coalesce(target_id, listing_id) where target_id is null and listing_id is not null';
  end if;

  if has_request_id then
    execute 'update public.pings set item_type = coalesce(item_type, ''request'') where item_type is null and request_id is not null';
    execute 'update public.pings set target_id = coalesce(target_id, request_id) where target_id is null and request_id is not null';
  end if;
end $$;

-- Backfill updated_at from created_at if created_at exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pings' and column_name = 'created_at'
  ) then
    execute 'update public.pings set updated_at = coalesce(updated_at, created_at) where updated_at is null';
  end if;
end $$;

-- Optionally enforce not null once backfilled
alter table public.pings
  alter column item_type set not null,
  alter column target_id set not null,
  alter column updated_at set not null;

-- Prevent duplicate pending pings per sender/target
create unique index if not exists uniq_pending_ping_by_sender_target
  on public.pings(sender_username, target_id)
  where status = 'pending';

-- Supportive indexes
create index if not exists idx_pings_target_status on public.pings(target_id, status);
create index if not exists idx_pings_sender_time on public.pings(sender_username, updated_at desc);

-- 2) Counter-cache trigger to maintain target ping_count ------------------------

-- Ensure ping_count columns exist on targets (no-ops if already present)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='listings' and column_name='ping_count'
  ) then
    execute 'alter table public.listings add column ping_count integer default 0 not null';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='requests' and column_name='ping_count'
  ) then
    execute 'alter table public.requests add column ping_count integer default 0 not null';
  end if;
end $$;

create or replace function public.fn_update_ping_counter_cache()
returns trigger
language plpgsql
as $$
declare
  affected_type text;
  affected_id uuid;
  delta integer := 0;
begin
  -- Determine item_type/target_id from NEW/OLD
  if (tg_op = 'INSERT') then
    affected_type := new.item_type; affected_id := new.target_id;
    if new.status = 'pending' then delta := 1; end if;
  elsif (tg_op = 'DELETE') then
    affected_type := old.item_type; affected_id := old.target_id;
    if old.status = 'pending' then delta := -1; end if;
  else -- UPDATE
    affected_type := coalesce(new.item_type, old.item_type);
    affected_id := coalesce(new.target_id, old.target_id);
    if (old.status = 'pending' and new.status <> 'pending') then delta := -1; end if;
    if (old.status <> 'pending' and new.status = 'pending') then delta := 1; end if;
    -- If target changed (should not in practice), adjust both
    if (old.target_id is distinct from new.target_id) then
      if old.status = 'pending' then
        if old.item_type = 'listing' then
          update public.listings set ping_count = greatest(ping_count - 1, 0) where id = old.target_id;
        elsif old.item_type = 'request' then
          update public.requests set ping_count = greatest(ping_count - 1, 0) where id = old.target_id;
        end if;
      end if;
      if new.status = 'pending' then
        if new.item_type = 'listing' then
          update public.listings set ping_count = ping_count + 1 where id = new.target_id;
        elsif new.item_type = 'request' then
          update public.requests set ping_count = ping_count + 1 where id = new.target_id;
        end if;
      end if;
      return new;
    end if;
  end if;

  if delta <> 0 then
    if affected_type = 'listing' then
      update public.listings set ping_count = greatest(ping_count + delta, 0) where id = affected_id;
    elsif affected_type = 'request' then
      update public.requests set ping_count = greatest(ping_count + delta, 0) where id = affected_id;
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists trg_pings_counter_cache_ins on public.pings;
drop trigger if exists trg_pings_counter_cache_upd on public.pings;
drop trigger if exists trg_pings_counter_cache_del on public.pings;

create trigger trg_pings_counter_cache_ins
after insert on public.pings
for each row execute function public.fn_update_ping_counter_cache();

create trigger trg_pings_counter_cache_upd
after update of status, target_id, item_type on public.pings
for each row execute function public.fn_update_ping_counter_cache();

create trigger trg_pings_counter_cache_del
after delete on public.pings
for each row execute function public.fn_update_ping_counter_cache();

-- 3) Unified RPC using target_id + updated_at -----------------------------------

drop function if exists public.create_ping_with_limits_unified(uuid,uuid,text,text,text,text);
drop function if exists public.create_ping_with_limits_unified(uuid,text,text,text,text);

create or replace function public.create_ping_with_limits_unified(
  target_id_param uuid,
  item_type_param text,
  sender_username_param text,
  receiver_username_param text,
  message_param text
)
returns table(
  success boolean,
  ping_id uuid,
  updated_at timestamptz,
  error text,
  message text,
  time_remaining_minutes integer,
  ping_count integer,
  first_response_at timestamptz,
  responded_at timestamptz,
  response_message text,
  last_ping_at timestamptz
)
language plpgsql
security definer
as $$
declare
  can_record record;
  current_ts timestamptz := now();
  cooldown interval := interval '1 minute';
  recent_ping record;
  new_ping_id uuid;
begin
  if item_type_param not in ('listing','request') then
    return query select false, null::uuid, null::timestamptz, 'invalid_item_type', 'Invalid item type', null::int, null::int, null::timestamptz, null::timestamptz, null::text, null::timestamptz; return;
  end if;
  if target_id_param is null then
    return query select false, null::uuid, null::timestamptz, 'invalid_target', 'Missing target id', null::int, null::int, null::timestamptz, null::timestamptz, null::text, null::timestamptz; return;
  end if;

  select * into can_record from public.check_ping_limits(sender_username_param);
  if not can_record.can_send then
    return query select false, null::uuid, null::timestamptz, 'daily_limit', can_record.message, null::int, null::int, null::timestamptz, null::timestamptz, null::text, null::timestamptz; return;
  end if;

  -- cooldown check for pending pings from same sender to same target
  select * into recent_ping from public.pings p
  where p.sender_username = sender_username_param
    and p.target_id = target_id_param
    and p.status = 'pending'
    and p.updated_at > current_ts - cooldown
  order by p.updated_at desc
  limit 1;

  if recent_ping is not null then
    return query select false, null::uuid, null::timestamptz, 'time_limit', 'You can ping again later', ceil(extract(epoch from ((recent_ping.updated_at + cooldown) - current_ts)) / 60)::int, null::int, null::timestamptz, null::timestamptz, null::text, null::timestamptz; return;
  end if;

  -- Insert ping using new schema only (no legacy columns)
  insert into public.pings (
    item_type,
    target_id,
    sender_username,
    receiver_username,
    message,
    status,
    updated_at
  ) values (
    item_type_param,
    target_id_param,
    sender_username_param,
    receiver_username_param,
    message_param,
    'pending',
    current_ts
  ) returning id into new_ping_id;

  return query select true,
    new_ping_id,
    current_ts,
    null::text,
    'Ping created',
    null::int,
    1,
    null::timestamptz,
    null::timestamptz,
    null::text,
    current_ts;
end;
$$;

grant execute on function public.create_ping_with_limits_unified(uuid,text,text,text,text) to authenticated;

-- 4) Clean up legacy constraints, indexes, columns, and dependent views ---------

-- Drop dependent views before column drops (will be recreated after)
drop view if exists public.v_pings_unified;
drop view if exists public.pings_with_listings;

-- Drop legacy partial unique indexes and constraints if they exist
do $$ begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'i' and c.relname = 'uniq_pending_listing_ping' and n.nspname = 'public'
  ) then execute 'drop index public.uniq_pending_listing_ping'; end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'i' and c.relname = 'uniq_pending_request_ping' and n.nspname = 'public'
  ) then execute 'drop index public.uniq_pending_request_ping'; end if;
  if exists (
    select 1 from pg_constraint where conname = 'pings_listing_or_request_chk'
  ) then execute 'alter table public.pings drop constraint pings_listing_or_request_chk'; end if;
end $$;

-- Drop legacy columns from pings (after view recreation)
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pings' and column_name='listing_id')
  then execute 'alter table public.pings drop column listing_id'; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pings' and column_name='request_id')
  then execute 'alter table public.pings drop column request_id'; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pings' and column_name='created_at')
  then execute 'alter table public.pings drop column created_at'; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pings' and column_name='response_time_minutes')
  then execute 'alter table public.pings drop column response_time_minutes'; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pings' and column_name='first_response_at')
  then execute 'alter table public.pings drop column first_response_at'; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pings' and column_name='responded_at')
  then execute 'alter table public.pings drop column responded_at'; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pings' and column_name='response_message')
  then execute 'alter table public.pings drop column response_message'; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pings' and column_name='last_ping_at')
  then execute 'alter table public.pings drop column last_ping_at'; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pings' and column_name='ping_count')
  then execute 'alter table public.pings drop column ping_count'; end if;
end $$;

-- Drop legacy triggers/functions/indexes that referenced listing_id/created_at
do $$ begin
  -- Triggers
  if exists (select 1 from pg_trigger where tgname = 'trigger_increment_ping_count') then
    execute 'drop trigger if exists trigger_increment_ping_count on public.pings';
  end if;
  if exists (select 1 from pg_trigger where tgname = 'trigger_update_ping_response_time') then
    execute 'drop trigger if exists trigger_update_ping_response_time on public.pings';
  end if;
  if exists (select 1 from pg_trigger where tgname = 'trigger_update_ping_analytics') then
    execute 'drop trigger if exists trigger_update_ping_analytics on public.pings';
  end if;
  if exists (select 1 from pg_trigger where tgname = 'trigger_update_ping_status_analytics') then
    execute 'drop trigger if exists trigger_update_ping_status_analytics on public.pings';
  end if;

  -- Functions
  if exists (select 1 from pg_proc where proname = 'increment_ping_count') then
    execute 'drop function if exists public.increment_ping_count()';
  end if;
  if exists (select 1 from pg_proc where proname = 'update_ping_response_time') then
    execute 'drop function if exists public.update_ping_response_time()';
  end if;
  if exists (select 1 from pg_proc where proname = 'update_ping_analytics') then
    execute 'drop function if exists public.update_ping_analytics()';
  end if;
  if exists (select 1 from pg_proc where proname = 'update_ping_status_analytics') then
    execute 'drop function if exists public.update_ping_status_analytics()';
  end if;

  -- Indexes on old columns
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'i' and c.relname = 'idx_pings_listing' and n.nspname = 'public'
  ) then
    execute 'drop index if exists public.idx_pings_listing';
  end if;
end $$;

commit;

-- Recreate views using new schema (no legacy columns referenced)

create or replace view public.v_pings_unified as
select 
  p.id,
  p.item_type,
  p.target_id,
  p.sender_username,
  p.receiver_username,
  p.message,
  p.status,
  p.updated_at,
  case when p.item_type = 'listing' then l.title end as listing_title,
  case when p.item_type = 'listing' then l.price end as listing_price,
  case when p.item_type = 'listing' then l.thumbnail_images end as listing_thumbnail_images,
  case when p.item_type = 'listing' then l.preview_images end as listing_preview_images,
  case when p.item_type = 'listing' then l.latitude end as listing_latitude,
  case when p.item_type = 'listing' then l.longitude end as listing_longitude,
  case when p.item_type = 'request' then r.title end as request_title,
  case when p.item_type = 'request' then r.budget_min end as request_budget_min,
  case when p.item_type = 'request' then r.thumbnail_images end as request_thumbnail_images,
  case when p.item_type = 'request' then r.preview_images end as request_preview_images,
  case when p.item_type = 'request' then r.latitude end as request_latitude,
  case when p.item_type = 'request' then r.longitude end as request_longitude
from public.pings p
left join public.listings l on (p.item_type = 'listing' and p.target_id = l.id)
left join public.requests r on (p.item_type = 'request' and p.target_id = r.id);

-- Ensure app roles can read the view
grant select on public.v_pings_unified to authenticated;

create or replace view public.pings_with_listings as
select 
  p.id,
  p.sender_username,
  p.receiver_username,
  p.message,
  p.status,
  p.updated_at,
  l.id as listing_id,
  l.title,
  l.price,
  l.thumbnail_images,
  l.preview_images
from public.pings p
join public.listings l on (p.item_type = 'listing' and p.target_id = l.id);

grant select on public.pings_with_listings to authenticated;


