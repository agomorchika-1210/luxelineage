-- ============================================
-- ENABLE REALTIME FOR NOTIFICATIONS TABLE
-- Run this in Supabase SQL Editor
-- ============================================

-- Method 1: Add table to existing publication (recommended)
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";

-- If the above doesn't work, try Method 2:
-- DROP PUBLICATION IF EXISTS supabase_realtime;
-- CREATE PUBLICATION supabase_realtime FOR TABLE "Notification";

-- Verify it's enabled (should return the table)
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'Notification';

-- Alternative: Check all tables in the publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

