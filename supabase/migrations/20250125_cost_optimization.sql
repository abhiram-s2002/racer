-- Migration: Cost Optimization for 100k Users
-- Date: 2025-01-25
-- Purpose: Reduce Supabase costs through database optimizations

-- 1. BATCH OPERATIONS: Get multiple users' data in single queries
CREATE OR REPLACE FUNCTION get_batch_chat_counts(usernames TEXT[])
RETURNS TABLE(username TEXT, chat_count INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.username,
        COUNT(c.id)::INTEGER as chat_count
    FROM unnest(usernames) AS u(username)
    LEFT JOIN chats c ON (c.participant_a = u.username OR c.participant_b = u.username)
    GROUP BY u.username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. BATCH UNREAD COUNTS: Get unread counts for multiple chats/users
CREATE OR REPLACE FUNCTION get_batch_unread_counts(chat_user_pairs JSONB)
RETURNS TABLE(chat_id UUID, username TEXT, unread_count INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (pair->>'chat_id')::UUID as chat_id,
        pair->>'username' as username,
        COUNT(m.id)::INTEGER as unread_count
    FROM jsonb_array_elements(chat_user_pairs) AS pair
    LEFT JOIN messages m ON m.chat_id = (pair->>'chat_id')::UUID
    WHERE m.sender_username != pair->>'username'
      AND (m.read_by IS NULL OR NOT (pair->>'username') = ANY(m.read_by))
    GROUP BY pair->>'chat_id', pair->>'username';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. MATERIALIZED VIEW for frequently accessed data
CREATE MATERIALIZED VIEW IF NOT EXISTS user_chat_summary AS
SELECT 
    u.username,
    COUNT(DISTINCT c.id) as total_chats,
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_chats,
    MAX(c.updated_at) as last_chat_activity,
    COUNT(DISTINCT m.id) as total_messages
FROM users u
LEFT JOIN chats c ON (c.participant_a = u.username OR c.participant_b = u.username)
LEFT JOIN messages m ON m.chat_id = c.id
GROUP BY u.username;

-- 4. Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chats_participants_status ON chats(participant_a, participant_b, status);
CREATE INDEX IF NOT EXISTS idx_messages_chat_sender_read ON messages(chat_id, sender_username, read_by);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 5. Partitioning for large tables (if you have millions of messages)
-- This reduces index size and improves query performance
-- CREATE TABLE messages_partitioned (
--     LIKE messages INCLUDING ALL
-- ) PARTITION BY RANGE (created_at);

-- 6. Function to refresh materialized view (run periodically)
CREATE OR REPLACE FUNCTION refresh_user_chat_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_chat_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION get_batch_chat_counts(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_batch_unread_counts(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_chat_summary() TO authenticated;
GRANT SELECT ON user_chat_summary TO authenticated;

-- 8. Comments
COMMENT ON FUNCTION get_batch_chat_counts(TEXT[]) IS 'Get chat counts for multiple users in single query (cost optimization)';
COMMENT ON FUNCTION get_batch_unread_counts(JSONB) IS 'Get unread counts for multiple chat-user pairs in single query (cost optimization)';
COMMENT ON MATERIALIZED VIEW user_chat_summary IS 'Pre-computed user chat statistics for cost reduction';
