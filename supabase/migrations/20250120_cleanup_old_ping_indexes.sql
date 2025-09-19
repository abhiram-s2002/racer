-- Clean up old indexes that reference the dropped created_at column on pings table
-- This fixes the "column created_at does not exist" error

BEGIN;

-- Drop all old indexes that reference created_at on pings table
DROP INDEX IF EXISTS idx_pings_created_at;
DROP INDEX IF EXISTS idx_pings_sender_status_created;
DROP INDEX IF EXISTS idx_pings_receiver_status_created;
DROP INDEX IF EXISTS idx_pings_recent;

-- Create new indexes using updated_at instead
CREATE INDEX IF NOT EXISTS idx_pings_updated_at ON pings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pings_sender_status_updated ON pings(sender_username, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pings_receiver_status_updated ON pings(receiver_username, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pings_recent_updated ON pings(updated_at DESC);

COMMIT;
