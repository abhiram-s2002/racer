-- Updated Image Storage System Migration
-- Migration: 20250123_updated_image_storage_system.sql
-- This migration updates the image storage system to use organized folder structure

-- ============================================================================
-- UPDATE LISTINGS TABLE FOR NEW IMAGE SYSTEM
-- ============================================================================

-- Add new columns for organized image storage
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS image_folder_path text,
ADD COLUMN IF NOT EXISTS image_metadata jsonb DEFAULT '{}';

-- Update existing listings to have proper image folder structure
UPDATE listings 
SET image_folder_path = CONCAT(username, '/', EXTRACT(EPOCH FROM created_at)::bigint)
WHERE image_folder_path IS NULL;

-- Create index for image folder paths
CREATE INDEX IF NOT EXISTS idx_listings_image_folder ON listings(image_folder_path);

-- ============================================================================
-- STORAGE BUCKET SETUP (if not exists)
-- ============================================================================

-- Create listings bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listings',
  'listings',
  true, -- Public bucket for listing images
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES FOR ORGANIZED FOLDER STRUCTURE
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view listing images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their listing images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their listing images" ON storage.objects;

-- Create new policies for organized folder structure
CREATE POLICY "Allow authenticated users to upload listing images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'listings' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IS NOT NULL -- Must be in a folder
);

CREATE POLICY "Allow public to view listing images" ON storage.objects
FOR SELECT USING (bucket_id = 'listings');

CREATE POLICY "Allow users to update their listing images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'listings' 
  AND auth.uid()::text = (storage.foldername(name))[1] -- User can only update their own folder
);

CREATE POLICY "Allow users to delete their listing images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'listings' 
  AND auth.uid()::text = (storage.foldername(name))[1] -- User can only delete their own folder
);

-- ============================================================================
-- FUNCTIONS FOR IMAGE MANAGEMENT
-- ============================================================================

-- Function to generate proper image folder path
CREATE OR REPLACE FUNCTION generate_image_folder_path(username_param text, listing_id uuid)
RETURNS text AS $$
BEGIN
  RETURN username_param || '/' || EXTRACT(EPOCH FROM NOW())::bigint;
END;
$$ LANGUAGE plpgsql;

-- Function to update image metadata
CREATE OR REPLACE FUNCTION update_listing_image_metadata()
RETURNS trigger AS $$
BEGIN
  -- Update image metadata when images are added/updated
  IF NEW.images IS NOT NULL AND array_length(NEW.images, 1) > 0 THEN
    NEW.image_metadata = jsonb_build_object(
      'original_count', array_length(NEW.images, 1),
      'thumbnail_count', COALESCE(array_length(NEW.thumbnail_images, 1), 0),
      'preview_count', COALESCE(array_length(NEW.preview_images, 1), 0),
      'last_updated', NOW(),
      'folder_structure', 'username/timestamp/'
    );
  END IF;
  
  -- Generate folder path if not exists
  IF NEW.image_folder_path IS NULL THEN
    NEW.image_folder_path = generate_image_folder_path(NEW.username, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for image metadata updates
DROP TRIGGER IF EXISTS trigger_update_image_metadata ON listings;
CREATE TRIGGER trigger_update_image_metadata
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_image_metadata();

-- Function to clean up orphaned images when listing is deleted
CREATE OR REPLACE FUNCTION cleanup_listing_images()
RETURNS trigger AS $$
DECLARE
  image_path text;
BEGIN
  -- Delete images from storage when listing is deleted
  IF OLD.image_folder_path IS NOT NULL THEN
    -- Delete all files in the listing's folder
    DELETE FROM storage.objects 
    WHERE bucket_id = 'listings' 
    AND name LIKE OLD.image_folder_path || '/%';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for image cleanup
DROP TRIGGER IF EXISTS trigger_cleanup_listing_images ON listings;
CREATE TRIGGER trigger_cleanup_listing_images
  AFTER DELETE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_listing_images();

-- ============================================================================
-- VALIDATION FUNCTIONS
-- ============================================================================

-- Function to validate image folder structure
CREATE OR REPLACE FUNCTION validate_image_folder_structure(folder_path text)
RETURNS boolean AS $$
BEGIN
  -- Check if folder path follows the pattern: username/timestamp
  RETURN folder_path ~ '^[a-zA-Z0-9_]+/\d+$';
END;
$$ LANGUAGE plpgsql;

-- Function to get listing images with proper URLs
CREATE OR REPLACE FUNCTION get_listing_images_with_metadata(listing_id_param uuid)
RETURNS TABLE(
  listing_id uuid,
  title text,
  username text,
  folder_path text,
  original_images text[],
  thumbnail_images text[],
  preview_images text[],
  image_metadata jsonb,
  total_images integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.username,
    l.image_folder_path,
    l.images,
    l.thumbnail_images,
    l.preview_images,
    l.image_metadata,
    COALESCE(array_length(l.images, 1), 0) + 
    COALESCE(array_length(l.thumbnail_images, 1), 0) + 
    COALESCE(array_length(l.preview_images, 1), 0) as total_images
  FROM listings l
  WHERE l.id = listing_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for image folder queries
CREATE INDEX IF NOT EXISTS idx_listings_image_folder_path ON listings(image_folder_path);

-- Index for image metadata queries
CREATE INDEX IF NOT EXISTS idx_listings_image_metadata ON listings USING gin(image_metadata);

-- Index for listings with images
CREATE INDEX IF NOT EXISTS idx_listings_has_images_new ON listings((array_length(images, 1) > 0));

-- ============================================================================
-- CLEANUP OLD IMAGE SYSTEM
-- ============================================================================

-- Remove legacy image_url column if it exists and is empty
ALTER TABLE listings DROP COLUMN IF EXISTS image_url;

-- Update existing listings to use new folder structure
UPDATE listings 
SET image_folder_path = generate_image_folder_path(username, id)
WHERE image_folder_path IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify the migration worked correctly
SELECT 
  'Migration Status' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'image_folder_path') 
    THEN '✅ image_folder_path column added'
    ELSE '❌ image_folder_path column missing'
  END as column_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'listings') 
    THEN '✅ listings bucket exists'
    ELSE '❌ listings bucket missing'
  END as bucket_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.policies WHERE bucket_id = 'listings') 
    THEN '✅ storage policies exist'
    ELSE '❌ storage policies missing'
  END as policy_status;

-- Show sample of updated listings
SELECT 
  'Sample Updated Listings' as check_type,
  id,
  title,
  username,
  image_folder_path,
  array_length(images, 1) as original_count,
  array_length(thumbnail_images, 1) as thumbnail_count,
  array_length(preview_images, 1) as preview_count
FROM listings 
WHERE image_folder_path IS NOT NULL
ORDER BY created_at DESC
LIMIT 5; 