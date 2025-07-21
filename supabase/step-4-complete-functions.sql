-- Step 4: Deploy Complete Cloud Functions
-- Run this in your Supabase SQL Editor after Step 3

-- ============================================================================
-- COMPLETE CLOUD FUNCTIONS DEPLOYMENT
-- ============================================================================

-- ============================================================================
-- LISTING EXPIRATION FUNCTIONS
-- ============================================================================

-- Automatic cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_listings()
RETURNS void AS $$
DECLARE
    expired_count integer;
    deleted_listing record;
BEGIN
    SELECT COUNT(*) INTO expired_count 
    FROM listings 
    WHERE expires_at <= now() AND is_active = true;
    
    RAISE NOTICE 'Cleaning up % expired listings', expired_count;
    
    FOR deleted_listing IN 
        SELECT id, username, title 
        FROM listings 
        WHERE expires_at <= now() AND is_active = true
    LOOP
        RAISE NOTICE 'Deleting expired listing: % (ID: %, User: %)', 
            deleted_listing.title, deleted_listing.id, deleted_listing.username;
        DELETE FROM listings WHERE id = deleted_listing.id;
    END LOOP;
    
    RAISE NOTICE 'Cleanup completed. Deleted % expired listings', expired_count;
END;
$$ LANGUAGE plpgsql;

-- Extension function
CREATE OR REPLACE FUNCTION extend_listing_expiration(
    listing_id_param uuid,
    extension_days integer DEFAULT 30
)
RETURNS json AS $$
DECLARE
    listing_record record;
    new_expires_at timestamp with time zone;
BEGIN
    SELECT * INTO listing_record 
    FROM listings 
    WHERE id = listing_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Listing not found'
        );
    END IF;
    
    IF NOT listing_record.is_active THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot extend inactive listing'
        );
    END IF;
    
    IF listing_record.expires_at <= now() THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot extend expired listing'
        );
    END IF;
    
    new_expires_at = GREATEST(listing_record.expires_at, now()) + (extension_days || ' days')::interval;
    
    UPDATE listings 
    SET 
        expires_at = new_expires_at,
        extension_count = extension_count + 1,
        updated_at = now()
    WHERE id = listing_id_param;
    
    RETURN json_build_object(
        'success', true,
        'new_expires_at', new_expires_at,
        'extension_count', listing_record.extension_count + 1
    );
END;
$$ LANGUAGE plpgsql;

-- Create listing with expiration
CREATE OR REPLACE FUNCTION create_listing_with_expiration(
    username_param text,
    title_param text,
    description_param text,
    price_param numeric,
    category_param text,
    images_param text[] DEFAULT '{}',
    latitude_param double precision DEFAULT NULL,
    longitude_param double precision DEFAULT NULL,
    expiration_days integer DEFAULT 30
)
RETURNS uuid AS $$
DECLARE
    new_listing_id uuid;
    expires_at_calc timestamp with time zone;
BEGIN
    expires_at_calc = now() + (expiration_days || ' days')::interval;
    
    INSERT INTO listings (
        username,
        title,
        description,
        price,
        category,
        images,
        latitude,
        longitude,
        expires_at,
        is_active
    ) VALUES (
        username_param,
        title_param,
        description_param,
        price_param,
        category_param,
        images_param,
        latitude_param,
        longitude_param,
        expires_at_calc,
        true
    ) RETURNING id INTO new_listing_id;
    
    RETURN new_listing_id;
END;
$$ LANGUAGE plpgsql;

-- Get listing expiration status
CREATE OR REPLACE FUNCTION get_listing_expiration_status(listing_id_param uuid)
RETURNS json AS $$
DECLARE
    listing_record record;
    days_until_expiry integer;
BEGIN
    SELECT * INTO listing_record 
    FROM listings 
    WHERE id = listing_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Listing not found'
        );
    END IF;
    
    days_until_expiry = EXTRACT(DAY FROM (listing_record.expires_at - now()))::integer;
    
    RETURN json_build_object(
        'success', true,
        'expires_at', listing_record.expires_at,
        'days_until_expiry', days_until_expiry,
        'is_expired', days_until_expiry <= 0,
        'extension_count', listing_record.extension_count
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CHAT FUNCTIONS
-- ============================================================================

-- Function to get chats for a user (grouped by participant)
CREATE OR REPLACE FUNCTION get_chats_for_user(username_param text)
RETURNS TABLE(
    id uuid,
    listing_id uuid,
    participant_a text,
    participant_b text,
    last_message text,
    last_sender text,
    status text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    other_participant text,
    other_participant_name text,
    other_participant_avatar text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.listing_id,
        c.participant_a,
        c.participant_b,
        c.last_message,
        c.last_sender,
        c.status,
        c.created_at,
        c.updated_at,
        CASE 
            WHEN c.participant_a = username_param THEN c.participant_b
            ELSE c.participant_a
        END as other_participant,
        u.name as other_participant_name,
        u.avatar_url as other_participant_avatar
    FROM chats c
    LEFT JOIN users u ON (
        CASE 
            WHEN c.participant_a = username_param THEN c.participant_b
            ELSE c.participant_a
        END = u.username
    )
    WHERE c.participant_a = username_param OR c.participant_b = username_param
    ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to create a chat from a ping (or find existing chat)
CREATE OR REPLACE FUNCTION create_chat_from_ping(ping_id uuid)
RETURNS text AS $$
DECLARE
    ping_record RECORD;
    existing_chat_id uuid;
    new_chat_id uuid;
BEGIN
    -- Get ping details
    SELECT * INTO ping_record
    FROM pings
    WHERE id = ping_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ping not found';
    END IF;
    
    -- Check if chat already exists for this listing and participants
    SELECT id INTO existing_chat_id
    FROM chats
    WHERE listing_id = ping_record.listing_id
    AND (
        (participant_a = ping_record.sender_username AND participant_b = ping_record.receiver_username)
        OR (participant_a = ping_record.receiver_username AND participant_b = ping_record.sender_username)
    );
    
    -- If chat exists, return existing chat ID
    IF existing_chat_id IS NOT NULL THEN
        -- Update the existing chat with the ping message
        UPDATE chats 
        SET 
            last_message = ping_record.message,
            last_sender = ping_record.sender_username,
            updated_at = NOW()
        WHERE id = existing_chat_id;
        
        -- Add the ping message to the chat
        INSERT INTO messages (chat_id, sender_username, text)
        VALUES (existing_chat_id, ping_record.sender_username, ping_record.message);
        
        RETURN existing_chat_id::text;
    END IF;
    
    -- Create new chat
    INSERT INTO chats (
        listing_id,
        participant_a,
        participant_b,
        last_message,
        last_sender,
        status
    )
    VALUES (
        ping_record.listing_id,
        ping_record.sender_username,
        ping_record.receiver_username,
        ping_record.message,
        ping_record.sender_username,
        'active'
    )
    RETURNING id INTO new_chat_id;
    
    -- Add the ping message to the new chat
    INSERT INTO messages (chat_id, sender_username, text)
    VALUES (new_chat_id, ping_record.sender_username, ping_record.message);
    
    -- Update ping status to accepted (since chat is created)
    UPDATE pings 
    SET status = 'accepted', responded_at = NOW()
    WHERE id = ping_id;
    
    RETURN new_chat_id::text;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create chat for two users and a listing
CREATE OR REPLACE FUNCTION get_or_create_chat(
    listing_id_param uuid,
    user1_param text,
    user2_param text
)
RETURNS uuid AS $$
DECLARE
    existing_chat_id uuid;
    new_chat_id uuid;
BEGIN
    -- Check if chat already exists
    SELECT id INTO existing_chat_id
    FROM chats
    WHERE listing_id = listing_id_param
    AND (
        (participant_a = user1_param AND participant_b = user2_param)
        OR (participant_a = user2_param AND participant_b = user1_param)
    );
    
    -- If chat exists, return existing chat ID
    IF existing_chat_id IS NOT NULL THEN
        RETURN existing_chat_id;
    END IF;
    
    -- Create new chat
    INSERT INTO chats (
        listing_id,
        participant_a,
        participant_b,
        status
    )
    VALUES (
        listing_id_param,
        user1_param,
        user2_param,
        'active'
    )
    RETURNING id INTO new_chat_id;
    
    RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get messages for a chat
CREATE OR REPLACE FUNCTION get_chat_messages(chat_id_param uuid)
RETURNS TABLE(
    id uuid,
    chat_id uuid,
    sender_username text,
    text text,
    status text,
    created_at timestamp with time zone,
    sender_name text,
    sender_avatar text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.chat_id,
        m.sender_username,
        m.text,
        m.status,
        m.created_at,
        u.name as sender_name,
        u.avatar_url as sender_avatar
    FROM messages m
    LEFT JOIN users u ON m.sender_username = u.username
    WHERE m.chat_id = chat_id_param
    ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to send a message in a chat
CREATE OR REPLACE FUNCTION send_chat_message(
    chat_id_param uuid,
    sender_username_param text,
    message_text text
)
RETURNS uuid AS $$
DECLARE
    new_message_id uuid;
BEGIN
    -- Insert the message
    INSERT INTO messages (chat_id, sender_username, text)
    VALUES (chat_id_param, sender_username_param, message_text)
    RETURNING id INTO new_message_id;
    
    -- Update chat with last message info
    UPDATE chats 
    SET 
        last_message = message_text,
        last_sender = sender_username_param,
        updated_at = NOW()
    WHERE id = chat_id_param;
    
    RETURN new_message_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ADDITIONAL REWARDS FUNCTIONS
-- ============================================================================

-- Function to complete referral when user completes first transaction
CREATE OR REPLACE FUNCTION complete_referral_on_first_listing()
RETURNS trigger AS $$
BEGIN
    -- Check if this is the user's first listing
    IF (SELECT COUNT(*) FROM listings WHERE username = NEW.username) = 1 THEN
        -- Update referral status to completed
        UPDATE referrals SET
            status = 'completed',
            completed_at = timezone('utc', now())
        WHERE referred_username = NEW.username AND status = 'pending';
        
        -- Award OMNI to both referrer and referred user
        INSERT INTO reward_transactions (username, transaction_type, amount, description, reference_id, reference_type)
        SELECT 
            referrer_username,
            'referral',
            100,
            'Referral bonus for ' || NEW.username,
            id,
            'referral'
        FROM referrals 
        WHERE referred_username = NEW.username AND status = 'completed';
        
        INSERT INTO reward_transactions (username, transaction_type, amount, description, reference_id, reference_type)
        VALUES (
            NEW.username,
            'referral',
            100,
            'Welcome bonus for being referred',
            (SELECT id FROM referrals WHERE referred_username = NEW.username AND status = 'completed'),
            'referral'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to award achievement completion
CREATE OR REPLACE FUNCTION award_achievement_completion()
RETURNS trigger AS $$
BEGIN
    -- If achievement was just completed
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        -- Award OMNI tokens
        INSERT INTO reward_transactions (username, transaction_type, amount, description, reference_id, reference_type)
        VALUES (
            NEW.username,
            'achievement',
            NEW.omni_earned,
            'Achievement completed: ' || (SELECT title FROM achievements WHERE id = NEW.achievement_id),
            NEW.id,
            'achievement'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ADDITIONAL TRIGGERS
-- ============================================================================

-- Trigger to complete referrals when first listing is created
DROP TRIGGER IF EXISTS trigger_complete_referral_on_first_listing ON listings;
CREATE TRIGGER trigger_complete_referral_on_first_listing
    AFTER INSERT ON listings
    FOR EACH ROW
    EXECUTE FUNCTION complete_referral_on_first_listing();

-- Trigger to award achievements when completed
DROP TRIGGER IF EXISTS trigger_award_achievement_completion ON user_achievements;
CREATE TRIGGER trigger_award_achievement_completion
    AFTER UPDATE ON user_achievements
    FOR EACH ROW
    EXECUTE FUNCTION award_achievement_completion();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that all functions were created successfully
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'cleanup_expired_listings',
    'extend_listing_expiration',
    'create_listing_with_expiration',
    'get_listing_expiration_status',
    'get_chats_for_user',
    'create_chat_from_ping',
    'get_or_create_chat',
    'get_chat_messages',
    'send_chat_message',
    'complete_referral_on_first_listing',
    'award_achievement_completion'
)
ORDER BY routine_name;

-- Check that all triggers were created successfully
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN (
    'trigger_complete_referral_on_first_listing',
    'trigger_award_achievement_completion'
)
ORDER BY trigger_name; 