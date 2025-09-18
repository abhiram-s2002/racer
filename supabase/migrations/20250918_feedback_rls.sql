-- RLS and policies for public.feedback
-- Date: 2025-09-18

-- Ensure table exists with expected columns (idempotent adjustments only)
do $$ begin
  perform 1 from information_schema.columns where table_schema='public' and table_name='feedback';
  -- If table doesn't exist, you can create it here; skipping to avoid destructive changes
exception when undefined_table then
  null;
end $$;

-- Ensure pgcrypto for UUID generation
create extension if not exists pgcrypto;

-- Add default for created_at
alter table if exists public.feedback
  alter column created_at set default timezone('utc', now());

-- Ensure id gets a default UUID
alter table if exists public.feedback
  alter column id set default gen_random_uuid();

-- Enable RLS
alter table if exists public.feedback enable row level security;

-- Drop existing policies (idempotent)
drop policy if exists "feedback_insert_authenticated" on public.feedback;
drop policy if exists "feedback_select_authenticated" on public.feedback;

-- Allow any authenticated user to insert feedback rows
create policy "feedback_insert_authenticated"
on public.feedback
for insert
to authenticated
with check (true);

-- Allow authenticated users to read feedback (optional; remove if not desired)
create policy "feedback_select_authenticated"
on public.feedback
for select
to authenticated
using (true);

-- Optionally, allow anon read (comment out if not needed)
-- create policy "feedback_select_anon" on public.feedback for select to anon using (true);


