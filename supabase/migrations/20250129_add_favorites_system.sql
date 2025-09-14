-- ============================================================================
-- FAVORITES SYSTEM
-- ============================================================================

-- Create user_favorites table for saving favorite listings
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    
    -- Ensure one favorite per user per listing
    UNIQUE(user_id, listing_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_username ON public.user_favorites(username);
CREATE INDEX IF NOT EXISTS idx_user_favorites_listing_id ON public.user_favorites(listing_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON public.user_favorites(created_at);

-- ============================================================================
-- FAVORITES FUNCTIONS
-- ============================================================================

-- Function to add a listing to favorites
CREATE OR REPLACE FUNCTION add_to_favorites(
    p_user_id UUID,
    p_username TEXT,
    p_listing_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Insert the favorite
    INSERT INTO public.user_favorites (user_id, username, listing_id)
    VALUES (p_user_id, p_username, p_listing_id)
    ON CONFLICT (user_id, listing_id) DO NOTHING;
    
    -- Return success
    result := json_build_object(
        'success', true,
        'message', 'Listing added to favorites'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM
        );
        RETURN result;
END;
$$;

-- Function to remove a listing from favorites
CREATE OR REPLACE FUNCTION remove_from_favorites(
    p_user_id UUID,
    p_listing_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Delete the favorite
    DELETE FROM public.user_favorites 
    WHERE user_id = p_user_id AND listing_id = p_listing_id;
    
    -- Return success
    result := json_build_object(
        'success', true,
        'message', 'Listing removed from favorites'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM
        );
        RETURN result;
END;
$$;

-- Function to check if a listing is favorited by user
CREATE OR REPLACE FUNCTION is_listing_favorited(
    p_user_id UUID,
    p_listing_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_favorites 
        WHERE user_id = p_user_id AND listing_id = p_listing_id
    );
END;
$$;

-- Drop existing function first to change return type
-- Drop all possible variations of the function
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS get_user_favorites(UUID, INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS get_user_favorites(UUID);
    DROP FUNCTION IF EXISTS get_user_favorites;
EXCEPTION
    WHEN OTHERS THEN
        -- Function doesn't exist, continue
        NULL;
END $$;

-- Function to get user's favorite listings with full listing data
CREATE OR REPLACE FUNCTION get_user_favorites(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    price NUMERIC,
    price_unit TEXT,
    category TEXT,
    username TEXT,
    name TEXT,
    avatar_url TEXT,
    location_display TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    thumbnail_images TEXT[],
    preview_images TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER,
    ping_count INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    favorited_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.price,
        l.price_unit,
        l.category,
        l.username,
        u.name,
        u.avatar_url,
        u.location_display,
        l.latitude,
        l.longitude,
        l.thumbnail_images,
        l.preview_images,
        l.created_at,
        COALESCE(l.view_count, 0) as view_count,
        COALESCE(l.ping_count, 0) as ping_count,
        l.expires_at,
        f.created_at as favorited_at
    FROM public.user_favorites f
    JOIN public.listings l ON f.listing_id = l.id
    JOIN public.users u ON l.username = u.username
    WHERE f.user_id = p_user_id
    ORDER BY f.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function to get favorite status for multiple listings
CREATE OR REPLACE FUNCTION get_favorites_status(
    p_user_id UUID,
    p_listing_ids UUID[]
)
RETURNS TABLE (
    listing_id UUID,
    is_favorited BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        listing_ids.listing_id,
        EXISTS (
            SELECT 1 FROM public.user_favorites f
            WHERE f.user_id = p_user_id AND f.listing_id = listing_ids.listing_id
        ) as is_favorited
    FROM unnest(p_listing_ids) as listing_ids(listing_id);
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on user_favorites table
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own favorites
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_favorites' AND policyname = 'Users can view their own favorites') THEN
        CREATE POLICY "Users can view their own favorites" ON public.user_favorites
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- Policy: Users can insert their own favorites
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_favorites' AND policyname = 'Users can add their own favorites') THEN
        CREATE POLICY "Users can add their own favorites" ON public.user_favorites
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Policy: Users can delete their own favorites
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_favorites' AND policyname = 'Users can remove their own favorites') THEN
        CREATE POLICY "Users can remove their own favorites" ON public.user_favorites
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant necessary permissions (idempotent)
DO $$ 
BEGIN
    GRANT SELECT, INSERT, DELETE ON public.user_favorites TO authenticated;
    GRANT EXECUTE ON FUNCTION add_to_favorites TO authenticated;
    GRANT EXECUTE ON FUNCTION remove_from_favorites TO authenticated;
    GRANT EXECUTE ON FUNCTION is_listing_favorited TO authenticated;
    GRANT EXECUTE ON FUNCTION get_user_favorites TO authenticated;
    GRANT EXECUTE ON FUNCTION get_favorites_status TO authenticated;
EXCEPTION
    WHEN OTHERS THEN
        -- Grants already exist, ignore error
        NULL;
END $$;
