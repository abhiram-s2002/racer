-- Migration: Smart Chat Loading System (Fixed for Current Schema)
-- Date: 2025-01-25
-- Purpose: Optimize chat loading by only loading recent chats instead of all chats

-- Function to get total chat count for a user
CREATE OR REPLACE FUNCTION get_total_chat_count(username_param TEXT)
RETURNS INTEGER AS $$
DECLARE
    chat_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO chat_count
    FROM chats
    WHERE participant_a = username_param 
       OR participant_b = username_param;
    
    RETURN COALESCE(chat_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get only recent chats for a user (optimized)
CREATE OR REPLACE FUNCTION get_recent_chats_for_user(
    username_param TEXT,
    limit_param INTEGER DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    participant_a TEXT,
    participant_b TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_message TEXT,
    last_sender TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.participant_a,
        c.participant_b,
        c.status,
        c.created_at,
        c.updated_at,
        c.last_message,
        c.last_sender
    FROM chats c
    WHERE c.participant_a = username_param 
       OR c.participant_b = username_param
    ORDER BY 
        COALESCE(c.updated_at, c.created_at) DESC -- Most recent activity first
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_total_chat_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_chats_for_user(TEXT, INTEGER) TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_participant_a_updated ON chats(participant_a, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_participant_b_updated ON chats(participant_b, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);

-- Add comment
COMMENT ON FUNCTION get_total_chat_count(TEXT) IS 'Get total number of chats for a user (for determining loading strategy)';
COMMENT ON FUNCTION get_recent_chats_for_user(TEXT, INTEGER) IS 'Get only recent chats for a user (optimized loading)';
