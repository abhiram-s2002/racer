-- Complete Notifications System Setup
-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
create extension if not exists pgcrypto;

-- ============================================================================
-- 2. DEVICE TOKENS TABLE
-- ============================================================================
create table if not exists public.device_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    fcm_token text not null,
    platform text not null check (platform in ('android')),
    updated_at timestamptz not null default timezone('utc', now()),
    unique (user_id, fcm_token)
);

-- Enable RLS
alter table public.device_tokens enable row level security;

-- RLS Policies for device_tokens
drop policy if exists "users_manage_own_tokens_select" on public.device_tokens;
create policy "users_manage_own_tokens_select"
on public.device_tokens for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "users_manage_own_tokens_insert" on public.device_tokens;
create policy "users_manage_own_tokens_insert"
on public.device_tokens for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users_manage_own_tokens_update" on public.device_tokens;
create policy "users_manage_own_tokens_update"
on public.device_tokens for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users_manage_own_tokens_delete" on public.device_tokens;
create policy "users_manage_own_tokens_delete"
on public.device_tokens for delete to authenticated
using (auth.uid() = user_id);

-- ============================================================================
-- 3. NOTIFICATIONS TABLE
-- ============================================================================
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_user_id uuid not null references auth.users(id) on delete cascade,
    type text not null check (type in ('ping_rejected','ping_accepted')),
    title text not null,
    body text not null,
    data jsonb not null default '{}'::jsonb,
    is_read boolean not null default false,
    delivered boolean not null default false,
    updated_at timestamptz not null default timezone('utc', now())
);

-- Enable RLS
alter table public.notifications enable row level security;

-- RLS Policies for notifications
drop policy if exists "recipient_can_read_notifications" on public.notifications;
create policy "recipient_can_read_notifications"
on public.notifications for select to authenticated
using (auth.uid() = recipient_user_id);

drop policy if exists "service_role_insert_notifications" on public.notifications;
create policy "service_role_insert_notifications"
on public.notifications for insert to service_role
with check (true);

drop policy if exists "service_role_update_notifications" on public.notifications;
create policy "service_role_update_notifications"
on public.notifications for update to service_role
using (true)
with check (true);

-- Allow service role to read notifications for debugging
drop policy if exists "service_role_read_notifications" on public.notifications;
create policy "service_role_read_notifications"
on public.notifications for select to service_role
using (true);

-- ============================================================================
-- 4. UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end $$;

-- Apply triggers
drop trigger if exists device_tokens_touch on public.device_tokens;
create trigger device_tokens_touch
before update on public.device_tokens
for each row execute function public.touch_updated_at();

drop trigger if exists notifications_touch on public.notifications;
create trigger notifications_touch
before update on public.notifications
for each row execute function public.touch_updated_at();

-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================
create index if not exists idx_device_tokens_user on public.device_tokens(user_id);
create index if not exists idx_notifications_recipient on public.notifications(recipient_user_id);
create index if not exists idx_notifications_delivered on public.notifications(delivered);
create index if not exists idx_notifications_updated on public.notifications(updated_at desc);

-- ============================================================================
-- 6. NOTIFICATION TRIGGERS FOR PING ACTIONS
-- ============================================================================

-- Helper function to get user ID by username
create or replace function public.user_id_by_username(p_username text)
returns uuid language sql stable as $$
  select id from public.users where username = p_username limit 1
$$;

-- Trigger for ping rejection
create or replace function public.on_ping_rejected_create_notification()
returns trigger language plpgsql security definer as $$
declare
  ping_creator_id uuid;
begin
  -- Check if ping status changed to 'rejected'
  if (old.status is distinct from new.status) and new.status = 'rejected' then
    -- Get ping creator user ID
    ping_creator_id := user_id_by_username(new.creator_username);
    if ping_creator_id is not null then
      insert into public.notifications (recipient_user_id, type, title, body, data)
      values (
        ping_creator_id,
        'ping_rejected',
        'Ping Rejected',
        'Your ping was rejected by the seller',
        jsonb_build_object('ping_id', new.id, 'seller_username', new.seller_username)
      );
    end if;
  end if;
  return new;
end $$;

-- Apply trigger for ping rejection
drop trigger if exists trg_ping_rejected_notif on public.pings;
create trigger trg_ping_rejected_notif
after update on public.pings
for each row execute function public.on_ping_rejected_create_notification();

-- Trigger for ping acceptance
create or replace function public.on_ping_accepted_create_notification()
returns trigger language plpgsql security definer as $$
declare
  ping_creator_id uuid;
begin
  -- Check if ping status changed to 'accepted'
  if (old.status is distinct from new.status) and new.status = 'accepted' then
    -- Get ping creator user ID
    ping_creator_id := user_id_by_username(new.creator_username);
    if ping_creator_id is not null then
      insert into public.notifications (recipient_user_id, type, title, body, data)
      values (
        ping_creator_id,
        'ping_accepted',
        'Ping Accepted',
        'Your ping was accepted by the seller',
        jsonb_build_object('ping_id', new.id, 'seller_username', new.seller_username)
      );
    end if;
  end if;
  return new;
end $$;

-- Apply trigger for ping acceptance
drop trigger if exists trg_ping_accepted_notif on public.pings;
create trigger trg_ping_accepted_notif
after update on public.pings
for each row execute function public.on_ping_accepted_create_notification();

-- ============================================================================
-- 7. VERIFICATION QUERIES
-- ============================================================================

-- Check if tables were created
select 
  'device_tokens' as table_name,
  case when exists (select 1 from information_schema.tables where table_name = 'device_tokens' and table_schema = 'public') 
    then '✅ Created' 
    else '❌ Missing' 
  end as status;

select 
  'notifications' as table_name,
  case when exists (select 1 from information_schema.tables where table_name = 'notifications' and table_schema = 'public') 
    then '✅ Created' 
    else '❌ Missing' 
  end as status;

-- Check if triggers were created
select 
  'ping_rejected_notification_trigger' as trigger_name,
  case when exists (select 1 from information_schema.triggers where trigger_name = 'trg_ping_rejected_notif') 
    then '✅ Created' 
    else '❌ Missing' 
  end as status;

select 
  'ping_accepted_notification_trigger' as trigger_name,
  case when exists (select 1 from information_schema.triggers where trigger_name = 'trg_ping_accepted_notif') 
    then '✅ Created' 
    else '❌ Missing' 
  end as status;

-- ============================================================================
-- 8. TEST NOTIFICATION (OPTIONAL)
-- ============================================================================

-- Uncomment the following lines to create a test notification
-- (Replace 'your-user-id' with an actual user ID from your users table)

/*
-- Get a user ID for testing
select id, username from auth.users limit 1;

-- Create a test notification (replace the user_id with actual value)
insert into public.notifications (
  recipient_user_id, 
  type, 
  title, 
  body, 
  data
) values (
  'your-user-id-here', -- Replace with actual user ID
  'ping_accepted',
  'Test Ping Notification',
  'This is a test ping notification',
  '{"ping_id": "test-ping-id", "seller_username": "test-seller"}'::jsonb
);

-- Check the notification was created
select * from public.notifications order by updated_at desc limit 5;
*/

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Next steps:
-- 1. Add FCM_SERVICE_ACCOUNT_JSON to Supabase secrets
-- 2. Deploy the send-fcm-working Edge Function
-- 3. Build and test your Android app
