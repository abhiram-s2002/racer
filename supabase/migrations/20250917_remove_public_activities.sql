-- Remove optional public.activities table and related objects (safe, idempotent)

begin;

-- Drop RLS policies if any
do $$
begin
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'activities'
  ) then
    -- Drop all policies generically
    perform format('drop policy if exists %I on public.activities', polname)
    from pg_policies where schemaname = 'public' and tablename = 'activities';
  end if;
exception when undefined_table then
  -- activities table not present; ignore
  null;
end $$;

-- Drop grants (optional; harmless if table missing)
revoke all on table public.activities from public;
revoke all on table public.activities from authenticated;

-- Drop the table itself (and any dependent objects)
drop table if exists public.activities cascade;

commit;


