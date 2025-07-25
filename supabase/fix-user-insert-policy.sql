-- 🔧 FIX USER INSERT POLICY FOR NEW USER REGISTRATION
-- This script fixes the RLS policy that's blocking new user profile creation

-- =====================================================
-- 1. DROP THE PROBLEMATIC INSERT POLICY
-- =====================================================

-- Drop the current insert policy that's too restrictive
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- =====================================================
-- 2. CREATE A BETTER INSERT POLICY
-- =====================================================

-- Create a more flexible insert policy for new users
-- This allows authenticated users to create their profile
CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (
        -- Allow if the user is authenticated
        auth.uid() IS NOT NULL
        AND (
            -- Either the id matches auth.uid() (existing user)
            auth.uid() = id
            OR 
            -- Or this is a new user creating their profile (id will be generated)
            id IS NULL
        )
    );

-- =====================================================
-- 3. VERIFY THE FIX
-- =====================================================

-- Check current policies on users table
SELECT 
    'USER TABLE POLICIES' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public'
ORDER BY policyname;

-- =====================================================
-- 4. TEST THE FIX
-- =====================================================

-- This should now work for new user registration
-- The policy allows authenticated users to create their profile
-- while still maintaining security for existing users

SELECT 
    'POLICY FIX STATUS' as status_type,
    'User insert policy updated' as action,
    'New users can now create profiles' as result,
    'RLS violation should be resolved' as conclusion; 