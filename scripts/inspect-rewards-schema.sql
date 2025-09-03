-- ============================================================================
-- INSPECT REWARDS / STREAKS / CHECKINS / ACHIEVEMENTS SCHEMA
-- Run this in Supabase SQL Editor to see the actual columns and constraints
-- ============================================================================

-- 1) Columns for key tables
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'user_streaks',
    'daily_checkins',
    'user_achievements',
    'achievements',
    'reward_transactions',
    'user_rewards'
  )
ORDER BY table_name, ordinal_position;

-- 2) Primary keys and unique constraints
SELECT 
  tc.table_name,
  tc.constraint_type,
  tc.constraint_name,
  kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'user_streaks',
    'daily_checkins',
    'user_achievements',
    'achievements',
    'reward_transactions',
    'user_rewards'
  )
ORDER BY tc.table_name, tc.constraint_type DESC;

-- 3) Show indexes
SELECT
  t.relname AS table_name,
  i.relname AS index_name,
  a.attname AS column_name,
  ix.indisunique AS is_unique
FROM
  pg_class t,
  pg_class i,
  pg_index ix,
  pg_attribute a
WHERE
  t.oid = ix.indrelid
  AND i.oid = ix.indexrelid
  AND a.attrelid = t.oid
  AND a.attnum = ANY(ix.indkey)
  AND t.relkind = 'r'
  AND t.relname IN (
    'user_streaks',
    'daily_checkins',
    'user_achievements',
    'achievements',
    'reward_transactions',
    'user_rewards'
  )
ORDER BY t.relname, i.relname;

-- 4) Sample record counts (to spot duplicates)
SELECT 'user_achievements' AS table, COUNT(*) FROM user_achievements
UNION ALL SELECT 'daily_checkins', COUNT(*) FROM daily_checkins
UNION ALL SELECT 'user_streaks', COUNT(*) FROM user_streaks
UNION ALL SELECT 'reward_transactions', COUNT(*) FROM reward_transactions
UNION ALL SELECT 'user_rewards', COUNT(*) FROM user_rewards;
