-- Create Storage Buckets for Marketplace Application
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STORAGE BUCKET CREATION
-- ============================================================================

-- 1. Create listings bucket for marketplace listing images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listings',
  'listings',
  true, -- Public bucket for listing images
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 2. Create avatars bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- Public bucket for avatar images
  2097152, -- 2MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- 3. Create temp bucket for temporary uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temp',
  'temp',
  false, -- Private bucket for temporary files
  10485760, -- 10MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- ============================================================================
-- STORAGE POLICIES FOR LISTINGS BUCKET
-- ============================================================================

-- Allow authenticated users to upload listing images
CREATE POLICY "Allow authenticated users to upload listing images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'listings' 
  AND auth.role() = 'authenticated'
);

-- Allow public to view listing images
CREATE POLICY "Allow public to view listing images" ON storage.objects
FOR SELECT USING (bucket_id = 'listings');

-- Allow users to update their own listing images
CREATE POLICY "Allow users to update their listing images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'listings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own listing images
CREATE POLICY "Allow users to delete their listing images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'listings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- STORAGE POLICIES FOR AVATARS BUCKET
-- ============================================================================

-- Allow authenticated users to upload avatar images
CREATE POLICY "Allow authenticated users to upload avatar images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Allow public to view avatar images
CREATE POLICY "Allow public to view avatar images" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to update their own avatar images
CREATE POLICY "Allow users to update their avatar images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatar images
CREATE POLICY "Allow users to delete their avatar images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- STORAGE POLICIES FOR TEMP BUCKET
-- ============================================================================

-- Allow authenticated users to upload temporary files
CREATE POLICY "Allow authenticated users to upload temp files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'temp' 
  AND auth.role() = 'authenticated'
);

-- Allow users to view their own temporary files
CREATE POLICY "Allow users to view their temp files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'temp' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own temporary files
CREATE POLICY "Allow users to delete their temp files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'temp' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that buckets were created successfully
SELECT 
  id as bucket_id,
  name as bucket_name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id IN ('listings', 'avatars', 'temp')
ORDER BY id;

-- Check that policies were created successfully
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname; 