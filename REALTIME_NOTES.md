# Realtime Notifications - Current Setup

## Current Implementation: Firebase Firestore

Your application currently uses **Firebase Firestore** for real-time notifications, not Supabase Realtime.

### How It Works:

1. **Backend** (`lib/notifications.ts`):
   - Saves notification to **Supabase** (for persistence/querying)
   - Also saves to **Firebase Firestore** (for real-time updates)

2. **Frontend** (`hooks/use-realtime-notifications.ts`):
   - Subscribes to Firebase Firestore using `onSnapshot`
   - Receives instant updates via WebSocket when notifications are created

### Do You Need Supabase Realtime?

**No, you don't need it** - your current Firebase setup works perfectly!

### If You Want to Switch to Supabase Realtime:

1. **Enable Realtime** (run `supabase-realtime-setup.sql`):
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";
   ```

2. **Update Backend** (`lib/notifications.ts`):
   - Remove Firebase Firestore writes
   - Keep only Supabase writes (realtime will handle the rest)

3. **Update Frontend** (`hooks/use-realtime-notifications.ts`):
   - Replace Firebase `onSnapshot` with Supabase Realtime subscription
   - Use `supabase.channel().on('postgres_changes', ...)`

### Benefits of Each Approach:

**Firebase Firestore (Current):**
- ✅ Already implemented and working
- ✅ No additional Supabase setup needed
- ✅ Good for hybrid Firebase/Supabase setups
- ❌ Requires Firebase project

**Supabase Realtime:**
- ✅ Single database (no dual writes)
- ✅ Simpler architecture
- ✅ Built into Supabase
- ❌ Requires code changes
- ❌ Need to enable Realtime publication

### Recommendation:

**Keep your current Firebase setup** unless you have a specific reason to switch. It's working well and doesn't require any Supabase Realtime configuration.

