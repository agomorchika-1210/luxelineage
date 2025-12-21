-- ============================================
-- SUPABASE REALTIME SETUP (OPTIONAL)
-- Only needed if you want to switch from Firebase to Supabase Realtime
-- ============================================

-- Enable Realtime for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";

-- Verify Realtime is enabled
-- You can check this in Supabase Dashboard → Database → Replication
-- The "Notification" table should show as "Active"

-- ============================================
-- NOTES:
-- ============================================
-- 
-- 1. Your current setup uses Firebase Firestore for realtime updates
-- 2. If you enable Supabase Realtime, you'll need to update your code:
--    - Update lib/notifications.ts to remove Firebase writes
--    - Update hooks/use-realtime-notifications.ts to use Supabase client
--    - Update components/realtime-notifications.tsx accordingly
--
-- 3. To use Supabase Realtime in your code, you'd need:
--    ```typescript
--    import { createClient } from '@supabase/supabase-js'
--    import { RealtimeChannel } from '@supabase/supabase-js'
--    
--    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
--    
--    const channel = supabase
--      .channel('notifications')
--      .on('postgres_changes', {
--        event: '*',
--        schema: 'public',
--        table: 'Notification'
--      }, (payload) => {
--        console.log('Notification update:', payload)
--      })
--      .subscribe()
--    ```
--
-- 4. Current Firebase setup works well and doesn't require this change
-- ============================================

