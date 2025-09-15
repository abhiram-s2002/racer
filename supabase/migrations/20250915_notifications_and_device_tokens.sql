-- Notifications and Device Tokens Schema
-- Date: 2025-09-15

-- Ensure required extensions
create extension if not exists pgcrypto;

-- device_tokens: store FCM tokens per user and device
create table if not exists public.device_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    fcm_token text not null,
    platform text not null check (platform in ('android')),
    updated_at timestamptz not null default timezone('utc', now()),
    unique (user_id, fcm_token)
);

alter table public.device_tokens enable row level security;

-- Users manage only their own tokens
create policy if not exists "users_manage_own_tokens_select"
on public.device_tokens for select to authenticated
using (auth.uid() = user_id);

create policy if not exists "users_manage_own_tokens_insert"
on public.device_tokens for insert to authenticated
with check (auth.uid() = user_id);

create policy if not exists "users_manage_own_tokens_update"
on public.device_tokens for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "users_manage_own_tokens_delete"
on public.device_tokens for delete to authenticated
using (auth.uid() = user_id);

-- notifications: single-source-of-truth for user-facing notifications
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_user_id uuid not null references auth.users(id) on delete cascade,
    type text not null check (type in ('request_created','request_accepted')),
    title text not null,
    body text not null,
    data jsonb not null default '{}'::jsonb,
    is_read boolean not null default false,
    delivered boolean not null default false,
    updated_at timestamptz not null default timezone('utc', now())
);

alter table public.notifications enable row level security;

-- Only recipient can read their notifications
create policy if not exists "recipient_can_read_notifications"
on public.notifications for select to authenticated
using (auth.uid() = recipient_user_id);

-- Only service role can write/mark delivered (done by Edge Function)
create policy if not exists "service_role_writes_notifications"
on public.notifications for insert, update to service_role
using (true)
with check (true);

-- Keep updated_at current
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end $$;

drop trigger if exists device_tokens_touch on public.device_tokens;
create trigger device_tokens_touch
before update on public.device_tokens
for each row execute function public.touch_updated_at();

drop trigger if exists notifications_touch on public.notifications;
create trigger notifications_touch
before update on public.notifications
for each row execute function public.touch_updated_at();

-- Helpful indexes
create index if not exists idx_device_tokens_user on public.device_tokens(user_id);
create index if not exists idx_notifications_recipient on public.notifications(recipient_user_id);
create index if not exists idx_notifications_delivered on public.notifications(delivered);
create index if not exists idx_notifications_updated on public.notifications(updated_at desc);

-- Verification queries (safe to run multiple times)
-- select count(*) from public.device_tokens;
-- select count(*) from public.notifications;


