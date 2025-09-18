-- Fix RPC function to return latitude and longitude coordinates
-- Migration: 20250127_fix_rpc_coordinates.sql

-- Drop and recreate the function with latitude/longitude fields
DROP FUNCTION IF EXISTS public.get_marketplace_items_with_distance(
  decimal, decimal, integer, text, text, boolean, numeric, numeric, text, text, text, integer, integer, timestamptz, uuid
);

CREATE OR REPLACE FUNCTION public.get_marketplace_items_with_distance(
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
RETURNS TABLE (
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
LANGUAGE sql
STABLE
AS $$
WITH params AS (
  SELECT
    user_lat::double precision AS lat,
    user_lng::double precision AS lng,
    (CASE WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(user_lng::double precision, user_lat::double precision), 4326)::geography
      ELSE NULL END) AS user_geog,
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
src_listings AS (
  SELECT
    l.id,
    'listing'::text AS item_type,
    l.username,
    l.title,
    l.description,
    l.category,
    l.price,
    l.price_unit,
    COALESCE(l.thumbnail_images, '{}') AS thumbnail_images,
    COALESCE(l.preview_images, '{}') AS preview_images,
    COALESCE(l.pickup_available, false) AS pickup_available,
    COALESCE(l.delivery_available, false) AS delivery_available,
    l.latitude,
    l.longitude,
    CASE WHEN p.user_geog IS NOT NULL AND l.location IS NOT NULL
      THEN ST_DistanceSphere(p.user_geog::geometry, l.location::geometry) / 1000.0
      ELSE NULL::double precision END AS distance_km,
    COALESCE(l.view_count, 0) AS view_count,
    COALESCE(l.ping_count, 0) AS ping_count,
    l.expires_at,
    l.created_at
  FROM public.listings l
  CROSS JOIN params p
  WHERE
    (l.expires_at IS NULL OR l.expires_at > NOW())
    AND (p.category_filter IS NULL OR l.category = p.category_filter)
    AND (p.min_price IS NULL OR l.price >= p.min_price)
    AND (p.max_price IS NULL OR l.price <= p.max_price)
    AND (
      p.search_query IS NULL
      OR l.search_tsv @@ plainto_tsquery('simple', p.search_query)
    )
    AND (
      p.verified_only IS NOT TRUE
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.username = l.username
          AND u.verification_status = 'verified'
          AND (u.expires_at IS NULL OR u.expires_at > NOW())
      )
    )
),
-- Requests source
src_requests AS (
  SELECT
    r.id,
    'request'::text AS item_type,
    COALESCE(r.requester_username, r.username) AS username,
    r.title,
    r.description,
    r.category,
    COALESCE(r.price, r.budget_min, 0)::numeric AS price,
    COALESCE(r.price_unit, 'budget') AS price_unit,
    COALESCE(r.thumbnail_images, '{}') AS thumbnail_images,
    COALESCE(r.preview_images, '{}') AS preview_images,
    COALESCE(r.pickup_available, false) AS pickup_available,
    COALESCE(r.delivery_available, false) AS delivery_available,
    r.latitude,
    r.longitude,
    CASE WHEN p.user_geog IS NOT NULL AND r.location IS NOT NULL
      THEN ST_DistanceSphere(p.user_geog::geometry, r.location::geometry) / 1000.0
      ELSE NULL::double precision END AS distance_km,
    COALESCE(r.view_count, 0) AS view_count,
    COALESCE(r.ping_count, 0) AS ping_count,
    r.expires_at,
    r.created_at
  FROM public.requests r
  CROSS JOIN params p
  WHERE
    (r.expires_at IS NULL OR r.expires_at > NOW())
    AND (p.category_filter IS NULL OR r.category = p.category_filter)
    AND (p.min_price IS NULL OR COALESCE(r.price, r.budget_min, 0) >= p.min_price)
    AND (p.max_price IS NULL OR COALESCE(r.price, r.budget_min, 0) <= p.max_price)
    AND (
      p.search_query IS NULL
      OR r.search_tsv @@ plainto_tsquery('simple', p.search_query)
    )
    AND (
      p.verified_only IS NOT TRUE
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.username = COALESCE(r.requester_username, r.username)
          AND u.verification_status = 'verified'
          AND (u.expires_at IS NULL OR u.expires_at > NOW())
      )
    )
),
-- Union with optional item-type filter
unioned AS (
  SELECT * FROM src_listings
  WHERE (SELECT item_type_filter FROM params) IS NULL OR (SELECT item_type_filter FROM params) = 'listing'
  UNION ALL
  SELECT * FROM src_requests
  WHERE (SELECT item_type_filter FROM params) IS NULL OR (SELECT item_type_filter FROM params) = 'request'
),
-- Apply distance filter last (works for both; null distances pass only if max_distance is null)
filtered AS (
  SELECT *
  FROM unioned u, params p
  WHERE
    (p.max_distance_km IS NULL)
    OR (u.distance_km IS NOT NULL AND u.distance_km <= p.max_distance_km)
    AND (
      -- keyset WHEN sorting by date desc (default)
      (p.sort_by = 'date' AND p.sort_order = 'desc' AND (p.last_created_at IS NULL OR (u.created_at, u.id) < (p.last_created_at, p.last_id)))
      OR (p.sort_by <> 'date') -- when not date-sorting, skip keyset filter
      OR (p.sort_order = 'asc') -- simple handling: skip keyset in asc
    )
)
SELECT
  id, item_type, username, title, description, category, price, price_unit,
  thumbnail_images, preview_images, pickup_available, delivery_available,
  latitude, longitude, distance_km, view_count, ping_count, expires_at, created_at
FROM filtered f, params p
ORDER BY
  CASE WHEN p.sort_by = 'distance' AND p.sort_order = 'asc' THEN f.distance_km END ASC NULLS LAST,
  CASE WHEN p.sort_by = 'distance' AND p.sort_order = 'desc' THEN f.distance_km END DESC NULLS LAST,
  CASE WHEN p.sort_by = 'price' AND p.sort_order = 'asc' THEN f.price END ASC NULLS LAST,
  CASE WHEN p.sort_by = 'price' AND p.sort_order = 'desc' THEN f.price END DESC NULLS LAST,
  CASE WHEN p.sort_by = 'date' AND p.sort_order = 'asc' THEN f.created_at END ASC NULLS LAST,
  CASE WHEN p.sort_by = 'date' AND p.sort_order = 'desc' THEN f.created_at END DESC NULLS LAST,
  f.id DESC -- tie-breaker
LIMIT (SELECT limit_count FROM params)
OFFSET (SELECT offset_count FROM params);
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_marketplace_items_with_distance(
  decimal, decimal, integer, text, text, boolean, numeric, numeric, text, text, text, integer, integer, timestamptz, uuid
) TO anon, authenticated, service_role;
