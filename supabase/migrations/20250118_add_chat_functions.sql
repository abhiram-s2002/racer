-- Migration: Add missing chat functions
-- Date: 2025-01-18
-- Description: Adds functions to properly group chats by user and create chats from pings

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_chats_for_user(text);

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

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS create_chat_from_ping(uuid);

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

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_or_create_chat(uuid, text, text);

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

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_chat_messages(uuid);

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

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS send_chat_message(uuid, text, text);

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
