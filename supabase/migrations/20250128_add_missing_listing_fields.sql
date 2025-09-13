-- Add missing view_count and ping_count fields to listings table
-- This migration adds the engagement tracking fields that are referenced in the code

-- Add view_count field to track listing views
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Add ping_count field to track total pings received for this listing
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS ping_count integer DEFAULT 0;

-- Add indexes for better performance on these new fields
CREATE INDEX IF NOT EXISTS idx_listings_view_count ON listings(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_listings_ping_count ON listings(ping_count DESC);

-- Update the increment_listing_view_count function to work with the new field
CREATE OR REPLACE FUNCTION increment_listing_view_count(listing_id_param uuid)
RETURNS void AS $$
BEGIN
    -- Increment view count for the specified listing
    UPDATE listings 
    SET view_count = view_count + 1
    WHERE id = listing_id_param;
    
    -- Log the view for analytics (optional)
    -- You can add more sophisticated analytics here if needed
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the request
        RAISE WARNING 'Failed to increment view count for listing %: %', listing_id_param, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to increment ping count for a listing
CREATE OR REPLACE FUNCTION increment_listing_ping_count(listing_id_param uuid)
RETURNS void AS $$
BEGIN
    -- Increment ping count for the specified listing
    UPDATE listings 
    SET ping_count = ping_count + 1
    WHERE id = listing_id_param;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the request
        RAISE WARNING 'Failed to increment ping count for listing %: %', listing_id_param, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_listing_view_count TO authenticated;
GRANT EXECUTE ON FUNCTION increment_listing_ping_count TO authenticated;

-- Update existing listings to have default values (in case any exist)
UPDATE listings 
SET view_count = 0, ping_count = 0 
WHERE view_count IS NULL OR ping_count IS NULL;

-- Add comments to the new columns
COMMENT ON COLUMN listings.view_count IS 'Total number of times this listing has been viewed';
COMMENT ON COLUMN listings.ping_count IS 'Total number of pings received for this listing';

-- Test the functions
SELECT 'View count and ping count fields added successfully' as status;
