-- Reusable migration: Unified marketplace RPC with full server-side filtering
-- Includes: function create/replace, generated search columns, and supporting indexes

-- 1) Ensure geo and common indexes exist (idempotent)
do $$ begin
  -- Create GiST index on listings.location only if it's geography/geometry; else fallback to (latitude, longitude)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'location'
      and udt_name in ('geography','geometry')
  ) then
    begin
      create index if not exists idx_listings_location on public.listings using gist (location);
    exception when undefined_function or invalid_table_definition then
      -- Operator class missing for current type; skip
      null;
    end;
  elsif exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='latitude'
  ) and exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='longitude'
  ) then
    create index if not exists idx_listings_lat_lon on public.listings(latitude, longitude);
  end if;
end $$;

do $$ begin
  -- Create GiST index on requests.location only if it's geography/geometry; else fallback to (latitude, longitude)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'location'
      and udt_name in ('geography','geometry')
  ) then
    begin
      create index if not exists idx_requests_location on public.requests using gist (location);
    exception when undefined_function or invalid_table_definition then
      -- Operator class missing for current type; skip
      null;
    end;
  elsif exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='requests' and column_name='latitude'
  ) and exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='requests' and column_name='longitude'
  ) then
    create index if not exists idx_requests_lat_lon on public.requests(latitude, longitude);
  end if;
end $$;

create index if not exists idx_listings_category on public.listings(category);
create index if not exists idx_requests_category on public.requests(category);
create index if not exists idx_listings_created_at on public.listings(created_at desc);
create index if not exists idx_requests_created_at on public.requests(created_at desc);
create index if not exists idx_listings_price on public.listings(price);
create index if not exists idx_requests_price on public.requests(price);

create index if not exists idx_users_username on public.users(username);
create index if not exists idx_users_verified on public.users(verification_status, expires_at);

-- 2) Add generated tsvector columns for search (idempotent)
alter table public.listings
  add column if not exists search_tsv tsvector
  generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))
  ) stored;

alter table public.requests
  add column if not exists search_tsv tsvector
  generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))
  ) stored;

create index if not exists idx_listings_search_tsv on public.listings using gin (search_tsv);
create index if not exists idx_requests_search_tsv on public.requests using gin (search_tsv);

-- 3) Unified RPC with full server-side filtering and safe LIMIT/OFFSET
create or replace function public.get_marketplace_items_with_distance(
  user_lat           decimal,                 -- nullable; if null, distance is null and not used for filtering
  user_lng           decimal,                 -- nullable
  max_distance_km    integer default null,    -- nullable means no distance filter
  item_type_filter   text default null,       -- 'listing' | 'request' | null (all)
  category_filter    text default null,       -- exact match; null = all
  verified_only      boolean default false,   -- true: only verified users
  min_price          numeric default null,    -- inclusive
  max_price          numeric default null,    -- inclusive
  search_query       text default null,       -- full text search on title/description
  sort_by            text default 'date',     -- 'distance' | 'date' | 'price'
  sort_order         text default 'desc',     -- 'asc' | 'desc'
  limit_count        integer default 20,
  offset_count       integer default 0,       -- prefer keyset for very deep pages
  last_created_at    timestamptz default null, -- keyset cursor
  last_id            uuid default null          -- keyset cursor tie-breaker
)
returns table (
  id uuid,
  item_type text,
  username text,
  title text,
  description text,
  category text,
  price numeric,
  price_unit text,
  thumbnail_images text[],
  preview_images text[],
  pickup_available boolean,
  delivery_available boolean,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  view_count integer,
  ping_count integer,
  expires_at timestamptz,
  created_at timestamptz
)
language sql
stable
as $$
with params as (
  select
    user_lat::double precision as lat,
    user_lng::double precision as lng,
    (case when user_lat is not null and user_lng is not null
      then ST_SetSRID(ST_MakePoint(user_lng::double precision, user_lat::double precision), 4326)::geography
      else null end) as user_geog,
    max_distance_km,
    item_type_filter,
    category_filter,
    verified_only,
    min_price,
    max_price,
    search_query,
    sort_by,
    sort_order,
    limit_count,
    offset_count,
    last_created_at,
    last_id
),
-- Listings source
src_listings as (
  select
    l.id,
    'listing'::text as item_type,
    l.username,
    l.title,
    l.description,
    l.category,
    l.price,
    l.price_unit,
    coalesce(l.thumbnail_images, '{}') as thumbnail_images,
    coalesce(l.preview_images, '{}') as preview_images,
    coalesce(l.pickup_available, false) as pickup_available,
    coalesce(l.delivery_available, false) as delivery_available,
    l.latitude,
    l.longitude,
    case when p.user_geog is not null and l.location is not null
      then ST_DistanceSphere(p.user_geog::geometry, l.location::geometry) / 1000.0
      else null::double precision end as distance_km,
    coalesce(l.view_count, 0) as view_count,
    coalesce(l.ping_count, 0) as ping_count,
    l.expires_at,
    l.created_at
  from public.listings l
  cross join params p
  where
    (l.expires_at is null or l.expires_at > now())
    and (p.category_filter is null or l.category = p.category_filter)
    and (p.min_price is null or l.price >= p.min_price)
    and (p.max_price is null or l.price <= p.max_price)
    and (
      p.search_query is null
      or l.search_tsv @@ plainto_tsquery('simple', p.search_query)
    )
    and (
      p.verified_only is not true
      or exists (
        select 1 from public.users u
        where u.username = l.username
          and u.verification_status = 'verified'
          and (u.expires_at is null or u.expires_at > now())
      )
    )
),
-- Requests source
src_requests as (
  select
    r.id,
    'request'::text as item_type,
    coalesce(r.requester_username, r.username) as username,
    r.title,
    r.description,
    r.category,
    coalesce(r.price, r.budget_min, 0)::numeric as price,
    coalesce(r.price_unit, 'budget') as price_unit,
    coalesce(r.thumbnail_images, '{}') as thumbnail_images,
    coalesce(r.preview_images, '{}') as preview_images,
    coalesce(r.pickup_available, false) as pickup_available,
    coalesce(r.delivery_available, false) as delivery_available,
    r.latitude,
    r.longitude,
    case when p.user_geog is not null and r.location is not null
      then ST_DistanceSphere(p.user_geog::geometry, r.location::geometry) / 1000.0
      else null::double precision end as distance_km,
    coalesce(r.view_count, 0) as view_count,
    coalesce(r.ping_count, 0) as ping_count,
    r.expires_at,
    r.created_at
  from public.requests r
  cross join params p
  where
    (r.expires_at is null or r.expires_at > now())
    and (p.category_filter is null or r.category = p.category_filter)
    and (p.min_price is null or coalesce(r.price, r.budget_min, 0) >= p.min_price)
    and (p.max_price is null or coalesce(r.price, r.budget_min, 0) <= p.max_price)
    and (
      p.search_query is null
      or r.search_tsv @@ plainto_tsquery('simple', p.search_query)
    )
    and (
      p.verified_only is not true
      or exists (
        select 1 from public.users u
        where u.username = coalesce(r.requester_username, r.username)
          and u.verification_status = 'verified'
          and (u.expires_at is null or u.expires_at > now())
      )
    )
),
-- Union with optional item-type filter
unioned as (
  select * from src_listings
  where (select item_type_filter from params) is null or (select item_type_filter from params) = 'listing'
  union all
  select * from src_requests
  where (select item_type_filter from params) is null or (select item_type_filter from params) = 'request'
),
-- Apply distance filter last (works for both; null distances pass only if max_distance is null)
filtered as (
  select *
  from unioned u, params p
  where
    (p.max_distance_km is null)
    or (u.distance_km is not null and u.distance_km <= p.max_distance_km)
    and (
      -- keyset WHEN sorting by date desc (default)
      (p.sort_by = 'date' and p.sort_order = 'desc' and (p.last_created_at is null or (u.created_at, u.id) < (p.last_created_at, p.last_id)))
      or (p.sort_by <> 'date') -- when not date-sorting, skip keyset filter
      or (p.sort_order = 'asc') -- simple handling: skip keyset in asc
    )
)
select
  id, item_type, username, title, description, category, price, price_unit,
  thumbnail_images, preview_images, pickup_available, delivery_available,
  latitude, longitude, distance_km, view_count, ping_count, expires_at, created_at
from filtered f, params p
order by
  case when p.sort_by = 'distance' and p.sort_order = 'asc' then f.distance_km end asc nulls last,
  case when p.sort_by = 'distance' and p.sort_order = 'desc' then f.distance_km end desc nulls last,
  case when p.sort_by = 'price' and p.sort_order = 'asc' then f.price end asc nulls last,
  case when p.sort_by = 'price' and p.sort_order = 'desc' then f.price end desc nulls last,
  case when p.sort_by = 'date' and p.sort_order = 'asc' then f.created_at end asc nulls last,
  case when p.sort_by = 'date' and p.sort_order = 'desc' then f.created_at end desc nulls last,
  f.id desc
limit (select greatest(limit_count, 1) from params)
offset (select greatest(offset_count, 0) from params);
$$;

-- 4) Grants
grant execute on function public.get_marketplace_items_with_distance(
  decimal, decimal, integer, text, text, boolean, numeric, numeric, text, text, text, integer, integer, timestamptz, uuid
) to anon, authenticated, service_role;


