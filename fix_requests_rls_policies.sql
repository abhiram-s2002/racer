-- Fix RLS policies for requests table
-- This script updates the existing RLS policies to use the correct authentication method

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.requests;

-- Create new policies using auth.uid() and users table lookup
CREATE POLICY "Users can create their own requests" ON public.requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.username = requester_username
        )
    );

CREATE POLICY "Users can update their own requests" ON public.requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.username = requester_username
        )
    );

CREATE POLICY "Users can delete their own requests" ON public.requests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.username = requester_username
        )
    );

-- Verify the policies were created
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
WHERE tablename = 'requests' 
ORDER BY policyname;
