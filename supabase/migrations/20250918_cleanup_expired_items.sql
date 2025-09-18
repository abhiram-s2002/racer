-- Cleanup expired listings and requests daily via pg_cron
-- Date: 2025-09-18

-- Ensure pg_cron extension is installed (idempotent)
create extension if not exists pg_cron;

-- Drop existing to allow changing return type/signature safely
drop function if exists public.cleanup_expired_listings();

-- Function: cleanup_expired_listings (bulk delete)
create or replace function public.cleanup_expired_listings()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.listings l
  where l.expires_at is not null
    and l.expires_at <= now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Drop existing to allow changing return type/signature safely
drop function if exists public.cleanup_expired_requests();

-- Function: cleanup_expired_requests (bulk delete)
create or replace function public.cleanup_expired_requests()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.requests r
  where r.expires_at is not null
    and r.expires_at <= now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Drop existing to allow changes safely
drop function if exists public.cleanup_expired_marketplace_items();

-- Optional: helper function to run both and return a summary
create or replace function public.cleanup_expired_marketplace_items()
returns json
language plpgsql
security definer
as $$
declare
  listings_deleted integer := 0;
  requests_deleted integer := 0;
begin
  listings_deleted := cleanup_expired_listings();
  requests_deleted := cleanup_expired_requests();
  return json_build_object(
    'listings_deleted', listings_deleted,
    'requests_deleted', requests_deleted,
    'ran_at', now()
  );
end;
$$;

-- Schedule daily jobs using pg_cron (idempotent)
-- We schedule both at fixed times; adjust if needed
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Remove existing jobs with same names to avoid duplicates
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in ('cleanup-expired-listings', 'cleanup-expired-requests', 'cleanup-expired-marketplace-items');

    -- Schedule listings cleanup daily at 03:00 UTC
    perform cron.schedule(
      'cleanup-expired-listings',
      '0 3 * * *',
      'select public.cleanup_expired_listings();'
    );

    -- Schedule requests cleanup daily at 03:10 UTC
    perform cron.schedule(
      'cleanup-expired-requests',
      '10 3 * * *',
      'select public.cleanup_expired_requests();'
    );
  end if;
end$$;

-- Grants
grant execute on function public.cleanup_expired_listings() to anon, authenticated, service_role;
grant execute on function public.cleanup_expired_requests() to anon, authenticated, service_role;
grant execute on function public.cleanup_expired_marketplace_items() to anon, authenticated, service_role;


