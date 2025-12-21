-- ============================================
-- VERIFY REALTIME IS ENABLED FOR NOTIFICATIONS
-- Run this to confirm it's working
-- ============================================

-- Check if Notification table is in the Realtime publication
SELECT 
    schemaname,
    tablename,
    'Enabled ✅' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'Notification';

-- If the above returns a row, Realtime IS enabled!

-- See all tables in Realtime publication
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Check Realtime publication details
SELECT 
    pubname as publication_name,
    puballtables as all_tables,
    pubinsert as insert_enabled,
    pubupdate as update_enabled,
    pubdelete as delete_enabled
FROM pg_publication 
WHERE pubname = 'supabase_realtime';

