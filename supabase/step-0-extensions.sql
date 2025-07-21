-- Step 0: Enable Required Extensions
-- Run this FIRST in your Supabase SQL Editor

-- ============================================================================
-- ENABLE REQUIRED EXTENSIONS
-- ============================================================================

-- Enable the earthdistance extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;

-- Enable the cube extension (required by earthdistance)
CREATE EXTENSION IF NOT EXISTS cube;

-- Enable the uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable the pgcrypto extension for cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that extensions were enabled successfully
SELECT 
    extname,
    extversion
FROM pg_extension 
WHERE extname IN ('earthdistance', 'cube', 'uuid-ossp', 'pgcrypto')
ORDER BY extname; 