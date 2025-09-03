-- Add request-based chat functionality
-- This migration adds functions to create and manage chats for requests

-- ============================================================================
-- REQUEST CHAT FUNCTIONS
-- ============================================================================

-- Function to get or create a chat between two users (one chat per user pair)
CREATE OR REPLACE FUNCTION get_or_create_request_chat(
    request_id_param uuid,
    current_user_param text,
    request_creator_param text,
    initial_message text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    existing_chat_id uuid;
    new_chat_id uuid;
BEGIN
    -- Check if chat already exists between these two users (regardless of request)
    SELECT id INTO existing_chat_id
    FROM chats
    WHERE (
        (participant_a = current_user_param AND participant_b = request_creator_param)
        OR (participant_a = request_creator_param AND participant_b = current_user_param)
    );
    
    -- If chat exists, return it
    IF existing_chat_id IS NOT NULL THEN
        -- Update last message if provided
        IF initial_message IS NOT NULL THEN
            UPDATE chats 
            SET 
                last_message = initial_message,
                last_sender = current_user_param,
                updated_at = NOW()
            WHERE id = existing_chat_id;
            
            -- Add the message
            INSERT INTO messages (chat_id, sender_username, text)
            VALUES (existing_chat_id, current_user_param, initial_message);
        END IF;
        
        RETURN existing_chat_id;
    END IF;
    
    -- Create new chat between the two users
    INSERT INTO chats (
        request_id,
        participant_a,
        participant_b,
        last_message,
        last_sender,
        status
    )
    VALUES (
        request_id_param,
        current_user_param,
        request_creator_param,
        initial_message,
        current_user_param,
        'active'
    )
    RETURNING id INTO new_chat_id;
    
    -- Add initial message if provided
    IF initial_message IS NOT NULL THEN
        INSERT INTO messages (chat_id, sender_username, text)
        VALUES (new_chat_id, current_user_param, initial_message);
    END IF;
    
    RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get chats for a user (one chat per user pair, regardless of requests)
CREATE OR REPLACE FUNCTION get_user_chats_with_requests(username_param text)
RETURNS TABLE(
    id uuid,
    listing_id uuid,
    request_id uuid,
    participant_a text,
    participant_b text,
    other_participant text,
    other_participant_name text,
    other_participant_avatar text,
    last_message text,
    last_sender text,
    status text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    listing_title text,
    request_title text,
    chat_type text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.listing_id,
        c.request_id,
        c.participant_a,
        c.participant_b,
        CASE 
            WHEN c.participant_a = username_param THEN c.participant_b
            ELSE c.participant_a
        END as other_participant,
        u.name as other_participant_name,
        u.avatar_url as other_participant_avatar,
        c.last_message,
        c.last_sender,
        c.status,
        c.created_at,
        c.updated_at,
        l.title as listing_title,
        r.title as request_title,
        CASE 
            WHEN c.request_id IS NOT NULL THEN 'request'
            ELSE 'listing'
        END as chat_type
    FROM chats c
    LEFT JOIN users u ON (
        CASE 
            WHEN c.participant_a = username_param THEN u.username = c.participant_b
            ELSE u.username = c.participant_a
        END
    )
    LEFT JOIN listings l ON c.listing_id = l.id
    LEFT JOIN requests r ON c.request_id = r.id
    WHERE (c.participant_a = username_param OR c.participant_b = username_param)
    AND c.status = 'active'
    ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE EXISTING CHAT TABLE
-- ============================================================================

-- Add request_id column to chats table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chats' 
        AND column_name = 'request_id'
    ) THEN
        ALTER TABLE public.chats ADD COLUMN request_id uuid REFERENCES public.requests(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add index for request_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_chats_request_id ON public.chats(request_id);

-- ============================================================================
-- RLS POLICIES FOR REQUEST CHATS
-- ============================================================================

-- Update existing RLS policies to include request-based chats
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;
CREATE POLICY "Users can view chats they participate in" ON public.chats
    FOR SELECT USING (
        participant_a = (SELECT username FROM public.users WHERE id = auth.uid())
        OR participant_b = (SELECT username FROM public.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
CREATE POLICY "Users can create chats" ON public.chats
    FOR INSERT WITH CHECK (
        participant_a = (SELECT username FROM public.users WHERE id = auth.uid())
        OR participant_b = (SELECT username FROM public.users WHERE id = auth.uid())
    );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify the functions were created
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_or_create_request_chat') 
        THEN '✅ get_or_create_request_chat function created'
        ELSE '❌ get_or_create_request_chat function missing'
    END as function_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_chats_with_requests') 
        THEN '✅ get_user_chats_with_requests function created'
        ELSE '❌ get_user_chats_with_requests function missing'
    END as function_status;

-- Verify request_id column was added
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'chats' AND column_name = 'request_id'
        ) 
        THEN '✅ request_id column added to chats table'
        ELSE '❌ request_id column missing'
    END as column_status;
