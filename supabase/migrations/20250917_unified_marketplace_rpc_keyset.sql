-- Update unified RPC to support keyset pagination (created_at, id)

create or replace function public.get_marketplace_items_with_distance(
  user_lat           decimal,
  user_lng           decimal,
  max_distance_km    integer default null,
  item_type_filter   text default null,
  category_filter    text default null,
  verified_only      boolean default false,
  min_price          numeric default null,
  max_price          numeric default null,
  search_query       text default null,
  sort_by            text default 'date',
  sort_order         text default 'desc',
  limit_count        integer default 20,
  offset_count       integer default 0,
  last_created_at    timestamptz default null,
  last_id            uuid default null
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
unioned as (
  select * from (
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
      case when p.user_geog is not null and l.location is not null
        then ST_DistanceSphere(p.user_geog::geometry, l.location::geometry) / 1000.0
        else null::double precision end as distance_km,
      coalesce(l.view_count, 0) as view_count,
      coalesce(l.ping_count, 0) as ping_count,
      l.expires_at,
      l.created_at
    from public.listings l
    cross join params p
    where (l.expires_at is null or l.expires_at > now())
      and (p.category_filter is null or l.category = p.category_filter)
      and (p.min_price is null or l.price >= p.min_price)
      and (p.max_price is null or l.price <= p.max_price)
      and (p.search_query is null or l.search_tsv @@ plainto_tsquery('simple', p.search_query))
      and (
        p.verified_only is not true or exists (
          select 1 from public.users u
          where u.username = l.username
            and u.verification_status = 'verified'
            and (u.expires_at is null or u.expires_at > now())
        )
      )
  ) listings_src
  where ((select item_type_filter from params) is null or (select item_type_filter from params) = 'listing')
  union all
  select * from (
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
      case when p.user_geog is not null and r.location is not null
        then ST_DistanceSphere(p.user_geog::geometry, r.location::geometry) / 1000.0
        else null::double precision end as distance_km,
      coalesce(r.view_count, 0) as view_count,
      coalesce(r.ping_count, 0) as ping_count,
      r.expires_at,
      r.created_at
    from public.requests r
    cross join params p
    where (r.expires_at is null or r.expires_at > now())
      and (p.category_filter is null or r.category = p.category_filter)
      and (p.min_price is null or coalesce(r.price, r.budget_min, 0) >= p.min_price)
      and (p.max_price is null or coalesce(r.price, r.budget_min, 0) <= p.max_price)
      and (p.search_query is null or r.search_tsv @@ plainto_tsquery('simple', p.search_query))
      and (
        p.verified_only is not true or exists (
          select 1 from public.users u
          where u.username = coalesce(r.requester_username, r.username)
            and u.verification_status = 'verified'
            and (u.expires_at is null or u.expires_at > now())
        )
      )
  ) requests_src
  where ((select item_type_filter from params) is null or (select item_type_filter from params) = 'request')
),
filtered as (
  select * from unioned u, params p
  where
    (p.max_distance_km is null) or (u.distance_km is not null and u.distance_km <= p.max_distance_km)
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
  distance_km, view_count, ping_count, expires_at, created_at
from filtered f, params p
order by
  case when p.sort_by = 'distance' and p.sort_order = 'asc' then f.distance_km end asc nulls last,
  case when p.sort_by = 'distance' and p.sort_order = 'desc' then f.distance_km end desc nulls last,
  case when p.sort_by = 'price' and p.sort_order = 'asc' then f.price end asc nulls last,
  case when p.sort_by = 'price' and p.sort_order = 'desc' then f.price end desc nulls last,
  case when p.sort_by = 'date' and p.sort_order = 'asc' then f.created_at end asc nulls last,
  case when p.sort_by = 'date' and p.sort_order = 'desc' then f.created_at end desc nulls last,
  -- tie-breaker for stable ordering
  f.id desc
limit (select greatest(limit_count, 1) from params)
offset (select greatest(offset_count, 0) from params);
$$;

grant execute on function public.get_marketplace_items_with_distance(
  decimal, decimal, integer, text, text, boolean, numeric, numeric, text, text, text, integer, integer, timestamptz, uuid
) to anon, authenticated, service_role;



