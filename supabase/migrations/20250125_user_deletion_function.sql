-- Create a comprehensive user deletion function
-- This function handles all cleanup when a user account is deleted

CREATE OR REPLACE FUNCTION delete_user_account(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_username text;
BEGIN
    -- Start a transaction to ensure all-or-nothing deletion
    BEGIN
        -- Get the username for the user
        SELECT username INTO user_username 
        FROM public.users 
        WHERE id = user_id;
        
        IF user_username IS NULL THEN
            RAISE EXCEPTION 'User not found';
        END IF;
    
    -- Delete in order to respect foreign key constraints
    
    -- 1. Delete pings (references users and listings)
    DELETE FROM public.pings 
    WHERE sender_username = user_username OR receiver_username = user_username;
    
    -- 2. Delete user's listings (this will cascade to any remaining related records)
    DELETE FROM public.listings WHERE username = user_username;
    
    -- 3. Delete user's requests
    DELETE FROM public.requests WHERE requester_username = user_username;
    
    -- 4. Delete user's ratings (both given and received)
    DELETE FROM public.user_ratings 
    WHERE rater_username = user_username OR rated_username = user_username;
    
    -- 5. Delete user's reward transactions
    DELETE FROM public.reward_transactions WHERE username = user_username;
    
    -- 6. Delete user's referrals
    DELETE FROM public.referrals 
    WHERE referrer_username = user_username OR referred_username = user_username;
    
    -- 7. Delete user's achievements
    DELETE FROM public.user_achievements WHERE username = user_username;
    
    -- 8. Delete user's leaderboard entries
    DELETE FROM public.leaderboard_cache WHERE username = user_username;
    
    -- 9. Delete user's user rewards
    DELETE FROM public.user_rewards WHERE username = user_username;
    
    -- 10. Delete user's user streaks
    DELETE FROM public.user_streaks WHERE username = user_username;
    
    -- 11. Delete user's daily checkins
    DELETE FROM public.daily_checkins WHERE username = user_username;
    
    -- 12. Delete user's feedback
    DELETE FROM public.feedback WHERE username = user_username;
    
    -- 13. Finally, delete the user record (should have no remaining references)
    DELETE FROM public.users WHERE id = user_id;
    
    -- 14. Delete the user from auth.users (this removes the authentication record)
    -- Note: This requires the function to run with elevated privileges
    DELETE FROM auth.users WHERE id = user_id;
    
        -- Log the deletion
        INSERT INTO public.cleanup_logs (table_name, deleted_count, cleaned_at)
        VALUES ('users', 1, NOW());
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback the transaction on any error
            RAISE EXCEPTION 'Failed to delete user account: %', SQLERRM;
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account(uuid) TO authenticated;

-- Grant execute permission to service role (for auth.users deletion)
GRANT EXECUTE ON FUNCTION delete_user_account(uuid) TO service_role;

-- Create a policy to allow users to delete their own account (if it doesn't exist)
DROP POLICY IF EXISTS "Users can delete their own account" ON public.users;
CREATE POLICY "Users can delete their own account" ON public.users
    FOR DELETE
    USING (auth.uid() = id);

-- Add comment
COMMENT ON FUNCTION delete_user_account(uuid) IS 'Comprehensively deletes a user account and all associated data';
