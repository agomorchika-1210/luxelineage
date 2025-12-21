# Supabase Realtime Migration - Complete Guide

## ✅ What's Been Updated

I've migrated your notifications system from Firebase to **Supabase Realtime**. Here's what changed:

### 1. **SQL Setup** (`supabase-setup.sql`)
- ✅ Added: `ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";`
- This enables Realtime replication for the Notification table

### 2. **Backend** (`lib/notifications.ts`)
- ✅ Removed Firebase Firestore writes
- ✅ Now only writes to Supabase (single source of truth)
- ✅ Supabase Realtime automatically broadcasts changes

### 3. **Frontend Hook** (`hooks/use-realtime-notifications.ts`)
- ✅ Replaced Firebase `onSnapshot` with Supabase Realtime subscription
- ✅ Uses `supabase.channel().on('postgres_changes', ...)`
- ✅ Fetches initial notifications from Supabase
- ✅ Listens to INSERT, UPDATE, DELETE events

### 4. **Supabase Client** (`lib/supabase-client.ts`)
- ✅ Created new file for Supabase client initialization
- ✅ Configured for client-side use with Realtime support

### 5. **Component** (`components/realtime-notifications.tsx`)
- ✅ Updated comments to reflect Supabase Realtime

## 📦 Required Package

You need to install the Supabase client:

```bash
npm install @supabase/supabase-js
```

## 🔧 Environment Variables

Add these to your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Where to find these:**
- Supabase Dashboard → Settings → API
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key

## 🚀 Setup Steps

### Step 1: Install Package
```bash
npm install @supabase/supabase-js
```

### Step 2: Add Environment Variables
Add to `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

### Step 3: Run SQL in Supabase
1. Go to Supabase Dashboard → SQL Editor
2. Run the updated `supabase-setup.sql` (it now includes Realtime setup)
3. Or run just this line:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";
   ```

### Step 4: Verify Realtime is Enabled
1. Go to Supabase Dashboard → Database → Replication
2. Find the "Notification" table
3. It should show as "Active" ✅

## 🎯 How It Works Now

### Before (Firebase):
```
Backend → Supabase (write) + Firebase (write)
Frontend → Subscribe to Firebase Firestore
```

### After (Supabase Realtime):
```
Backend → Supabase (write only)
Frontend → Subscribe to Supabase Realtime
```

**Benefits:**
- ✅ Single source of truth (Supabase only)
- ✅ No dual writes needed
- ✅ Simpler architecture
- ✅ Built into Supabase (no separate Firebase project needed)

## 🔍 Testing

1. **Create a notification** (via order processing):
   - Process an order
   - Notification should appear instantly in admin panel

2. **Mark as read**:
   - Click notification
   - Should update in real-time

3. **Check Realtime connection**:
   - Open browser console
   - Should see "Realtime notification update" logs

## 🐛 Troubleshooting

### "Supabase client not initialized"
- Check environment variables are set
- Restart dev server after adding env vars

### "Realtime not working"
- Verify Realtime is enabled in Supabase Dashboard → Database → Replication
- Check browser console for errors
- Ensure `ALTER PUBLICATION` SQL was run

### "Cannot read property 'from' of undefined"
- Make sure `@supabase/supabase-js` is installed
- Check Supabase client is properly initialized

## 📝 Code Changes Summary

| File | Change |
|------|--------|
| `supabase-setup.sql` | Added Realtime publication |
| `lib/notifications.ts` | Removed Firebase, single Supabase write |
| `hooks/use-realtime-notifications.ts` | Switched to Supabase Realtime subscription |
| `lib/supabase-client.ts` | **NEW** - Supabase client setup |
| `components/realtime-notifications.tsx` | Updated comments |

## ✅ Next Steps

1. Install `@supabase/supabase-js`
2. Add environment variables
3. Run SQL to enable Realtime
4. Test notifications
5. (Optional) Remove Firebase dependencies if not used elsewhere

