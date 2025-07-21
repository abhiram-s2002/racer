-- Complete Marketplace Setup Migration
-- Migration: 20250116_complete_marketplace_setup.sql
-- This file contains the complete marketplace database setup with all current features

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable PostGIS extension for location-based features
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table with all fields
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text UNIQUE NOT NULL,
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    avatar_url text,
    phone text,
    bio text,
    location text,
    location_display text,
    isAvailable boolean DEFAULT true,
    stats jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Listings table with enhanced image support
CREATE TABLE IF NOT EXISTS listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    price numeric NOT NULL,
    category text,
    images text[], -- Original images
    thumbnail_images text[], -- Thumbnail images (400x400)
    preview_images text[], -- Preview images (200x200)
    image_url text, -- Legacy field for backward compatibility
    is_active boolean DEFAULT true,
    latitude double precision,
    longitude double precision,
    location geography(point),
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Chats table for conversations
CREATE TABLE IF NOT EXISTS chats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    participant_a text NOT NULL REFERENCES users(username),
    participant_b text NOT NULL REFERENCES users(username),
    last_message text,
    last_sender text,
    status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    
    -- Ensure unique chat per listing per participant pair
    UNIQUE(listing_id, participant_a, participant_b)
);

-- Messages table for chat messages
CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_username text NOT NULL REFERENCES users(username),
    text text NOT NULL,
    status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Activities table for user activity tracking
CREATE TABLE IF NOT EXISTS activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES users(username),
    type text NOT NULL,
    listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
    title text,
    price numeric,
    image text,
    status text,
    message text,
    user_name text,
    user_avatar text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Pings table for ping system
CREATE TABLE IF NOT EXISTS pings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    sender_username text NOT NULL REFERENCES users(username),
    receiver_username text NOT NULL REFERENCES users(username),
    message text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    response_time_minutes integer,
    first_response_at timestamp with time zone,
    responded_at timestamp with time zone,
    response_message text,
    ping_count integer DEFAULT 1,
    last_ping_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    
    -- Ensure unique ping per user per listing (prevent spam)
    UNIQUE(sender_username, listing_id, status)
);

-- Ping analytics table
CREATE TABLE IF NOT EXISTS ping_analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL,
    total_pings_sent integer DEFAULT 0,
    total_pings_received integer DEFAULT 0,
    accepted_pings integer DEFAULT 0,
    rejected_pings integer DEFAULT 0,
    average_response_time_minutes decimal(10,2),
    last_activity_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Ping limits table for spam protection
CREATE TABLE IF NOT EXISTS ping_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL UNIQUE,
    daily_pings_sent integer DEFAULT 0,
    daily_pings_limit integer DEFAULT 50,
    last_reset_date date DEFAULT current_date,
    cooldown_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Feedback table for user feedback
CREATE TABLE IF NOT EXISTS feedback (
    username text NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    feedback text DEFAULT 'No additional feedback provided'::text CHECK (length(feedback) <= 200),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT feedback_pkey PRIMARY KEY (id),
    CONSTRAINT feedback_username_fkey FOREIGN KEY (username) REFERENCES public.users(username)
);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create listings bucket (public, for listing images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listings',
  'listings',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket (public, for user avatars)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB in bytes
  ARRAY['image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- Create temp bucket (private, for temporary uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temp',
  'temp',
  false,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;

-- Create permissive policies for listings bucket
CREATE POLICY "Anyone can upload listing images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'listings' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can update listing images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'listings' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can delete listing images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'listings' 
    AND auth.role() = 'authenticated'
  );

-- Ensure public read policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Listings are publicly accessible'
  ) THEN
    CREATE POLICY "Listings are publicly accessible" ON storage.objects
      FOR SELECT USING (bucket_id = 'listings');
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Listings indexes
CREATE INDEX IF NOT EXISTS idx_listings_username ON listings(username);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_is_active ON listings(is_active);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_updated_at ON listings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING gist(location);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_has_images ON listings((array_length(images, 1) > 0));

-- Chats indexes
CREATE INDEX IF NOT EXISTS idx_chats_listing_id ON chats(listing_id);
CREATE INDEX IF NOT EXISTS idx_chats_participant_a ON chats(participant_a);
CREATE INDEX IF NOT EXISTS idx_chats_participant_b ON chats(participant_b);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_username ON messages(sender_username);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_username ON activities(username);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_listing_id ON activities(listing_id);

-- Pings indexes
CREATE INDEX IF NOT EXISTS idx_pings_sender_username ON pings(sender_username);
CREATE INDEX IF NOT EXISTS idx_pings_receiver_username ON pings(receiver_username);
CREATE INDEX IF NOT EXISTS idx_pings_listing_id ON pings(listing_id);
CREATE INDEX IF NOT EXISTS idx_pings_status ON pings(status);
CREATE INDEX IF NOT EXISTS idx_pings_created_at ON pings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pings_response_time ON pings(response_time_minutes);
CREATE INDEX IF NOT EXISTS idx_pings_first_response_at ON pings(first_response_at);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_ping_analytics_username ON ping_analytics(username);

-- Limits indexes
CREATE INDEX IF NOT EXISTS idx_ping_limits_username ON ping_limits(username);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_username ON feedback(username);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update location from lat/lng
CREATE OR REPLACE FUNCTION update_location_from_lat_lng()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for location updates
DROP TRIGGER IF EXISTS update_listings_location ON listings;
CREATE TRIGGER update_listings_location
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_location_from_lat_lng();

-- Function to update ping response time
CREATE OR REPLACE FUNCTION update_ping_response_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate response time when ping is first responded to
    IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
        IF NEW.first_response_at IS NULL THEN
            NEW.first_response_at = NOW();
        END IF;
        NEW.responded_at = NOW();
        NEW.response_time_minutes = EXTRACT(EPOCH FROM (NEW.responded_at - NEW.created_at)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ping response time
DROP TRIGGER IF EXISTS trigger_update_ping_response_time ON pings;
CREATE TRIGGER trigger_update_ping_response_time
    BEFORE UPDATE ON pings
    FOR EACH ROW
    EXECUTE FUNCTION update_ping_response_time();

-- Function to update ping analytics on insert
CREATE OR REPLACE FUNCTION update_ping_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update sender analytics
    INSERT INTO ping_analytics (username, total_pings_sent, last_activity_at)
    VALUES (NEW.sender_username, 1, NOW())
    ON CONFLICT (username) DO UPDATE SET
        total_pings_sent = ping_analytics.total_pings_sent + 1,
        last_activity_at = NOW();
    
    -- Update receiver analytics
    INSERT INTO ping_analytics (username, total_pings_received, last_activity_at)
    VALUES (NEW.receiver_username, 1, NOW())
    ON CONFLICT (username) DO UPDATE SET
        total_pings_received = ping_analytics.total_pings_received + 1,
        last_activity_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ping analytics
DROP TRIGGER IF EXISTS trigger_update_ping_analytics ON pings;
CREATE TRIGGER trigger_update_ping_analytics
    AFTER INSERT ON pings
    FOR EACH ROW
    EXECUTE FUNCTION update_ping_analytics();

-- Function to update ping status analytics
CREATE OR REPLACE FUNCTION update_ping_status_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update accepted/rejected counts
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
        UPDATE ping_analytics 
        SET accepted_pings = accepted_pings + 1
        WHERE username = NEW.receiver_username;
    ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
        UPDATE ping_analytics 
        SET rejected_pings = rejected_pings + 1
        WHERE username = NEW.receiver_username;
    END IF;
    
    -- Update average response time
    IF NEW.response_time_minutes IS NOT NULL THEN
        UPDATE ping_analytics 
        SET average_response_time_minutes = (
            (average_response_time_minutes * (accepted_pings + rejected_pings - 1) + NEW.response_time_minutes) / 
            (accepted_pings + rejected_pings)
        )
        WHERE username = NEW.receiver_username;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ping status analytics
DROP TRIGGER IF EXISTS trigger_update_ping_status_analytics ON pings;
CREATE TRIGGER trigger_update_ping_status_analytics
    AFTER UPDATE ON pings
    FOR EACH ROW
    EXECUTE FUNCTION update_ping_status_analytics();

-- Function to increment ping count
CREATE OR REPLACE FUNCTION increment_ping_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment ping count for existing ping
    UPDATE pings 
    SET ping_count = ping_count + 1,
        last_ping_at = NOW()
    WHERE sender_username = NEW.sender_username 
    AND listing_id = NEW.listing_id 
    AND status = 'pending';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ping count
DROP TRIGGER IF EXISTS trigger_increment_ping_count ON pings;
CREATE TRIGGER trigger_increment_ping_count
    AFTER INSERT ON pings
    FOR EACH ROW
    EXECUTE FUNCTION increment_ping_count();

-- Function to reset daily ping limits
CREATE OR REPLACE FUNCTION reset_daily_ping_limits()
RETURNS void AS $$
BEGIN
    UPDATE ping_limits 
    SET daily_pings_sent = 0, 
        last_reset_date = current_date
    WHERE last_reset_date < current_date;
END;
$$ LANGUAGE plpgsql;

-- Function to check ping limits
CREATE OR REPLACE FUNCTION check_ping_limits(username_param text)
RETURNS TABLE(
    can_send boolean,
    daily_pings_sent integer,
    daily_pings_limit integer,
    cooldown_until timestamp with time zone,
    message text
) AS $$
DECLARE
    user_limit RECORD;
    current_time timestamp with time zone := NOW();
BEGIN
    -- Reset limits if it's a new day
    PERFORM reset_daily_ping_limits();
    
    -- Get user's ping limits
    SELECT * INTO user_limit 
    FROM ping_limits 
    WHERE username = username_param;
    
    -- If no record exists, create one
    IF user_limit IS NULL THEN
        INSERT INTO ping_limits (username, daily_pings_sent, daily_pings_limit)
        VALUES (username_param, 0, 50)
        RETURNING * INTO user_limit;
    END IF;
    
    -- Check cooldown
    IF user_limit.cooldown_until IS NOT NULL AND current_time < user_limit.cooldown_until THEN
        RETURN QUERY SELECT 
            false as can_send,
            user_limit.daily_pings_sent,
            user_limit.daily_pings_limit,
            user_limit.cooldown_until,
            'You are in cooldown period. Please wait before sending another ping.' as message;
        RETURN;
    END IF;
    
    -- Check daily limit
    IF user_limit.daily_pings_sent >= user_limit.daily_pings_limit THEN
        RETURN QUERY SELECT 
            false as can_send,
            user_limit.daily_pings_sent,
            user_limit.daily_pings_limit,
            user_limit.cooldown_until,
            'Daily ping limit reached. Please try again tomorrow.' as message;
        RETURN;
    END IF;
    
    -- Can send ping
    RETURN QUERY SELECT 
        true as can_send,
        user_limit.daily_pings_sent,
        user_limit.daily_pings_limit,
        user_limit.cooldown_until,
        'OK' as message;
END;
$$ LANGUAGE plpgsql;

-- Function to get ping insights
CREATE OR REPLACE FUNCTION get_ping_insights(username_param text)
RETURNS TABLE(
    total_pings_sent integer,
    total_pings_received integer,
    accepted_pings integer,
    rejected_pings integer,
    average_response_time_minutes decimal(10,2),
    acceptance_rate decimal(5,2),
    response_rate decimal(5,2),
    last_activity_at timestamp with time zone
) AS $$
DECLARE
    analytics RECORD;
BEGIN
    SELECT * INTO analytics 
    FROM ping_analytics 
    WHERE username = username_param;
    
    IF analytics IS NULL THEN
        RETURN QUERY SELECT 
            0, 0, 0, 0, 0.0, 0.0, 0.0, NULL::timestamp with time zone;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT 
        analytics.total_pings_sent,
        analytics.total_pings_received,
        analytics.accepted_pings,
        analytics.rejected_pings,
        analytics.average_response_time_minutes,
        CASE 
            WHEN analytics.total_pings_received > 0 
            THEN (analytics.accepted_pings::decimal / analytics.total_pings_received * 100)
            ELSE 0 
        END as acceptance_rate,
        CASE 
            WHEN analytics.total_pings_received > 0 
            THEN ((analytics.accepted_pings + analytics.rejected_pings)::decimal / analytics.total_pings_received * 100)
            ELSE 0 
        END as response_rate,
        analytics.last_activity_at;
END;
$$ LANGUAGE plpgsql;

-- Function to get listings with distance
CREATE OR REPLACE FUNCTION get_listings_with_distance(
    user_lat double precision,
    user_lng double precision,
    page_num integer DEFAULT 1,
    page_size integer DEFAULT 20,
    max_distance_km integer DEFAULT 1000
)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    price numeric,
    category text,
    images text[],
    thumbnail_images text[],
    preview_images text[],
    is_active boolean,
    username text,
    latitude double precision,
    longitude double precision,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    distance_km double precision,
    image_count integer,
    has_images boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.price,
        l.category,
        l.images,
        l.thumbnail_images,
        l.preview_images,
        l.is_active,
        l.username,
        l.latitude,
        l.longitude,
        l.created_at,
        l.updated_at,
        ST_Distance(
            l.location::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000 as distance_km,
        array_length(l.images, 1) as image_count,
        array_length(l.images, 1) > 0 as has_images
    FROM listings l
    WHERE l.is_active = true
    AND l.latitude IS NOT NULL 
    AND l.longitude IS NOT NULL
    AND ST_Distance(
        l.location::geography,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) <= (max_distance_km * 1000)
    ORDER BY distance_km ASC, l.created_at DESC
    LIMIT page_size
    OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- Function to check ping time limit
CREATE OR REPLACE FUNCTION check_ping_time_limit(
    sender_username_param text,
    listing_id_param uuid
)
RETURNS TABLE(
    can_ping boolean,
    time_until_next_ping interval,
    message text
) AS $$
DECLARE
    last_ping RECORD;
    time_since_last_ping interval;
    min_interval interval := interval '5 minutes';
BEGIN
    -- Get the last ping for this user and listing
    SELECT * INTO last_ping
    FROM pings
    WHERE sender_username = sender_username_param
    AND listing_id = listing_id_param
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no previous ping, allow
    IF last_ping IS NULL THEN
        RETURN QUERY SELECT 
            true as can_ping,
            interval '0' as time_until_next_ping,
            'OK' as message;
        RETURN;
    END IF;
    
    -- Calculate time since last ping
    time_since_last_ping := NOW() - last_ping.created_at;
    
    -- Check if enough time has passed
    IF time_since_last_ping >= min_interval THEN
        RETURN QUERY SELECT 
            true as can_ping,
            interval '0' as time_until_next_ping,
            'OK' as message;
    ELSE
        RETURN QUERY SELECT 
            false as can_ping,
            min_interval - time_since_last_ping as time_until_next_ping,
            'Please wait before sending another ping to this listing.' as message;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old pings
CREATE OR REPLACE FUNCTION cleanup_old_pings()
RETURNS void AS $$
BEGIN
    -- Delete pings older than 30 days that are still pending
    DELETE FROM pings 
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to create ping with limits
CREATE OR REPLACE FUNCTION create_ping_with_limits(
    listing_id_param uuid,
    sender_username_param text,
    receiver_username_param text,
    message_param text
)
RETURNS TABLE(
    success boolean,
    ping_id uuid,
    message text
) AS $$
DECLARE
    limit_check RECORD;
    time_check RECORD;
    new_ping_id uuid;
BEGIN
    -- Check ping limits
    SELECT * INTO limit_check 
    FROM check_ping_limits(sender_username_param);
    
    IF NOT limit_check.can_send THEN
        RETURN QUERY SELECT 
            false as success,
            NULL::uuid as ping_id,
            limit_check.message;
        RETURN;
    END IF;
    
    -- Check time limit
    SELECT * INTO time_check 
    FROM check_ping_time_limit(sender_username_param, listing_id_param);
    
    IF NOT time_check.can_ping THEN
        RETURN QUERY SELECT 
            false as success,
            NULL::uuid as ping_id,
            time_check.message;
        RETURN;
    END IF;
    
    -- Create the ping
    INSERT INTO pings (listing_id, sender_username, receiver_username, message)
    VALUES (listing_id_param, sender_username_param, receiver_username_param, message_param)
    RETURNING id INTO new_ping_id;
    
    -- Update ping count
    UPDATE ping_limits 
    SET daily_pings_sent = daily_pings_sent + 1
    WHERE username = sender_username_param;
    
    RETURN QUERY SELECT 
        true as success,
        new_ping_id as ping_id,
        'Ping created successfully' as message;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- IMAGE SUPPORT FUNCTIONS
-- ============================================================================

-- Function to clean up orphaned images
CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS void AS $$
DECLARE
    listing_record RECORD;
    image_url text;
    bucket_name text;
    file_path text;
BEGIN
    -- Find listings that have been deleted but images might still exist
    -- This is a safety function to clean up orphaned images
    
    -- For now, we'll just log that this function exists
    -- In production, you might want to implement actual cleanup logic
    RAISE NOTICE 'Cleanup function available for orphaned images';
    
    -- Example cleanup logic (commented out for safety):
    /*
    FOR listing_record IN 
        SELECT id, images, thumbnail_images, preview_images 
        FROM listings 
        WHERE is_active = false 
        AND updated_at < NOW() - INTERVAL '30 days'
    LOOP
        -- Clean up original images
        IF listing_record.images IS NOT NULL THEN
            FOREACH image_url IN ARRAY listing_record.images
            LOOP
                -- Extract bucket and file path from URL
                -- This would need to be implemented based on your URL structure
                -- bucket_name := extract_bucket_from_url(image_url);
                -- file_path := extract_path_from_url(image_url);
                
                -- Delete from storage (implement based on your storage API)
                -- PERFORM delete_from_storage(bucket_name, file_path);
            END LOOP;
        END IF;
        
        -- Similar cleanup for thumbnail and preview images
    END LOOP;
    */
END;
$$ LANGUAGE plpgsql;

-- Function to update image fields
CREATE OR REPLACE FUNCTION update_image_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Set default values for new listings
    IF TG_OP = 'INSERT' THEN
        IF NEW.images IS NULL THEN
            NEW.images := ARRAY[]::text[];
        END IF;
        IF NEW.thumbnail_images IS NULL THEN
            NEW.thumbnail_images := ARRAY[]::text[];
        END IF;
        IF NEW.preview_images IS NULL THEN
            NEW.preview_images := ARRAY[]::text[];
        END IF;
    END IF;
    
    -- Ensure arrays are not null
    IF NEW.images IS NULL THEN
        NEW.images := ARRAY[]::text[];
    END IF;
    IF NEW.thumbnail_images IS NULL THEN
        NEW.thumbnail_images := ARRAY[]::text[];
    END IF;
    IF NEW.preview_images IS NULL THEN
        NEW.preview_images := ARRAY[]::text[];
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for image field updates
DROP TRIGGER IF EXISTS trigger_update_image_fields ON listings;
CREATE TRIGGER trigger_update_image_fields
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_image_fields();

-- Function to get listing with image metadata
CREATE OR REPLACE FUNCTION get_listing_with_images(listing_id uuid)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    price numeric,
    category text,
    images text[],
    thumbnail_images text[],
    preview_images text[],
    is_active boolean,
    username text,
    latitude double precision,
    longitude double precision,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    image_count integer,
    has_images boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.price,
        l.category,
        l.images,
        l.thumbnail_images,
        l.preview_images,
        l.is_active,
        l.username,
        l.latitude,
        l.longitude,
        l.created_at,
        l.updated_at,
        array_length(l.images, 1) as image_count,
        array_length(l.images, 1) > 0 as has_images
    FROM listings l
    WHERE l.id = listing_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get listings with image statistics
CREATE OR REPLACE FUNCTION get_listings_with_image_stats(
    page_num integer DEFAULT 1,
    page_size integer DEFAULT 20
)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    price numeric,
    category text,
    images text[],
    thumbnail_images text[],
    preview_images text[],
    is_active boolean,
    username text,
    latitude double precision,
    longitude double precision,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    image_count integer,
    has_images boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.price,
        l.category,
        l.images,
        l.thumbnail_images,
        l.preview_images,
        l.is_active,
        l.username,
        l.latitude,
        l.longitude,
        l.created_at,
        l.updated_at,
        array_length(l.images, 1) as image_count,
        array_length(l.images, 1) > 0 as has_images
    FROM listings l
    WHERE l.is_active = true
    ORDER BY l.created_at DESC
    LIMIT page_size
    OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN listings.images IS 'Array of original image URLs (1200x1200px, 85% quality)';
COMMENT ON COLUMN listings.thumbnail_images IS 'Array of thumbnail image URLs (400x400px, 70% quality) for faster loading';
COMMENT ON COLUMN listings.preview_images IS 'Array of preview image URLs (200x200px, 70% quality) for grid views';
COMMENT ON COLUMN chats.status IS 'Chat status: active, archived, or blocked';
COMMENT ON FUNCTION cleanup_orphaned_images() IS 'Function to clean up orphaned images from storage';
COMMENT ON FUNCTION get_listing_with_images(uuid) IS 'Get listing with image metadata and statistics';
COMMENT ON FUNCTION get_listings_with_image_stats(integer, integer) IS 'Get paginated listings with image statistics';
COMMENT ON FUNCTION get_listings_with_distance(double precision, double precision, integer, integer, integer) IS 'Get listings sorted by distance from user location';
COMMENT ON FUNCTION check_ping_limits(text) IS 'Check if user can send pings based on daily limits and cooldown';
COMMENT ON FUNCTION create_ping_with_limits(uuid, text, text, text) IS 'Create ping with automatic limit checking';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify buckets were created
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id IN ('listings', 'avatars', 'temp')
ORDER BY id;

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'listings', 'chats', 'messages', 'activities', 'pings', 'ping_analytics', 'ping_limits', 'feedback')
ORDER BY table_name;

-- Verify all functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
AND routine_name IN (
  'update_location_from_lat_lng',
  'update_ping_response_time',
  'update_ping_analytics',
  'update_ping_status_analytics',
  'increment_ping_count',
  'reset_daily_ping_limits',
  'check_ping_limits',
  'get_ping_insights',
  'get_listings_with_distance',
  'check_ping_time_limit',
  'cleanup_old_pings',
  'create_ping_with_limits',
  'cleanup_orphaned_images',
  'update_image_fields',
  'get_listing_with_images',
  'get_listings_with_image_stats'
)
ORDER BY routine_name; 