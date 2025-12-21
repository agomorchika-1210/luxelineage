# 🚀 Complete Supabase Setup Guide

This guide will help you set up Supabase for your fashion e-commerce application, replacing all Firebase functionality.

## 📋 Prerequisites

- Supabase account and project created
- Database migrations run (Prisma)
- Environment variables configured in `.env`

## 🔧 Step 1: Enable Supabase Realtime for Notifications

Supabase Realtime uses PostgreSQL's logical replication to stream database changes. You need to enable it for the `Notification` table.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Database** > **Replication**
3. Find the `Notification` table
4. Toggle it to **Active** (or click **Enable**)

### Option B: Using SQL Editor

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable Realtime for the Notification table
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";

-- Verify it's enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename = 'Notification';
```

**Expected Result:** You should see one row with `schemaname = 'public'` and `tablename = 'Notification'`

## 👤 Step 2: Create Admin User in Supabase Auth

1. Go to **Supabase Dashboard** > **Authentication** > **Users**
2. Click **Add User** or **Create User**
3. Enter:
   - **Email**: `admin@luxelineage.com` (or your admin email)
   - **Password**: (set a secure password)
   - **Auto Confirm User**: ✅ (check this)
4. Click **Create User**
5. **Copy the User UID** (you'll need this for the next step)

## 🗄️ Step 3: Seed Admin in Database

Run the seed script to link the Supabase Auth user to your database:

```bash
# Set the Supabase UID you copied
SUPABASE_ADMIN_UID=your-uid-here npm run db:seed
```

Or add it to your `.env` file:
```env
SUPABASE_ADMIN_UID=your-uid-here
ADMIN_EMAIL=admin@luxelineage.com
```

Then run:
```bash
npm run db:seed
```

**Expected Output:**
```
✅ Admin created in database:
   ID: clx...
   Email: admin@luxelineage.com
   Supabase UID: abc123...
```

## ✅ Step 4: Verify Setup

### Test Authentication

1. Start your dev server: `npm run dev`
2. Navigate to `/admin/login`
3. Login with:
   - Email: `admin@luxelineage.com`
   - Password: (the password you set in Supabase Auth)

### Test Realtime Notifications

1. Login to admin panel
2. Create a test order (or process an existing order)
3. You should see a notification appear in real-time without refreshing

## 🔍 Troubleshooting

### Realtime Not Working?

1. **Check Replication Status:**
   - Go to Dashboard > Database > Replication
   - Ensure `Notification` table shows as "Active"

2. **Check Table Name:**
   - PostgreSQL is case-sensitive
   - Table name must be exactly `Notification` (capital N)
   - Check in Dashboard > Database > Tables

3. **Check Browser Console:**
   - Open browser DevTools > Console
   - Look for Supabase connection errors
   - Check WebSocket connection status

4. **Verify Environment Variables:**
   ```bash
   # Check these are set correctly
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   SUPABASE_SECRET_KEY
   ```

### Authentication Not Working?

1. **Check User Exists:**
   - Dashboard > Authentication > Users
   - Verify your admin user exists

2. **Check Database Link:**
   - Run: `npm run db:seed` again
   - Verify the UID matches between Supabase Auth and database

3. **Check API Keys:**
   - Dashboard > Settings > API
   - Verify you're using the correct keys:
     - `publishable` key (not `anon`)
     - `secret` key (not `service_role`)

### Database Connection Issues?

1. **Check Connection String:**
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```

2. **Test Connection:**
   ```bash
   npm run db:studio
   ```
   This should open Prisma Studio and connect to your database

## 📊 What's Now Using Supabase

✅ **Authentication** - Supabase Auth (replaces Firebase Auth)
✅ **Database** - Supabase PostgreSQL (via Prisma)
✅ **Realtime Notifications** - Supabase Realtime (replaces Firebase Firestore)
✅ **Storage** - Supabase Storage (available for product images)

## 🎯 Next Steps

1. **Enable Storage** (optional):
   - Dashboard > Storage
   - Create buckets for product images
   - See `supabase-storage-setup.sql` for setup

2. **Set Up Row Level Security (RLS)** (recommended for production):
   - Dashboard > Authentication > Policies
   - Create policies for your tables

3. **Monitor Usage:**
   - Dashboard > Settings > Usage
   - Track API calls, database size, etc.

## 📝 Important Notes

- The database field is still named `firebaseUid` for backward compatibility, but it now stores Supabase UIDs
- All Firebase dependencies have been removed
- Realtime works automatically once enabled - no code changes needed
- Notifications are stored in PostgreSQL and streamed via WebSocket

## 🆘 Need Help?

- Check Supabase logs: Dashboard > Logs
- Review Supabase docs: https://supabase.com/docs
- Check your application logs for detailed error messages

