# Realtime Notifications Troubleshooting

## Issue: Notification table doesn't show under Replication

### Step 1: Run the SQL Command

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this command:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";
```

3. Click **Run**

### Step 2: Verify It Worked

Run this query to check:

```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

You should see `Notification` in the results.

### Step 3: Check Replication Dashboard

1. Go to **Database** → **Replication**
2. Refresh the page
3. Look for `Notification` table
4. It should show as **"Active"** ✅

## Common Issues

### Issue 1: "Table does not exist"
**Solution:** Make sure the table was created first. Run:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'Notification';
```

### Issue 2: "Publication does not exist"
**Solution:** The publication might need to be created first:
```sql
-- Check if publication exists
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- If it doesn't exist, create it
CREATE PUBLICATION supabase_realtime FOR TABLE "Notification";
```

### Issue 3: Case Sensitivity
**Solution:** PostgreSQL is case-sensitive. Make sure you use:
- `"Notification"` (with quotes and capital N)
- Not `notification` or `NOTIFICATION`

### Issue 4: Table Name Mismatch
**Solution:** Check the exact table name:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%otification%';
```

## Alternative: Enable via Dashboard

If SQL doesn't work, try the Dashboard:

1. Go to **Database** → **Replication**
2. Click **"Add Table"** or **"Enable Realtime"**
3. Select `Notification` table
4. Click **Save**

## Verify Realtime is Working

After enabling, test it:

1. **Backend:** Create a notification (process an order)
2. **Frontend:** Check browser console for Realtime messages
3. **Supabase Dashboard:** Go to **Database** → **Replication** → Check `Notification` shows as Active

## Still Not Working?

1. **Check RLS Policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'Notification';
   ```
   Make sure RLS is enabled and policies allow reads.

2. **Check Table Exists:**
   ```sql
   \d "Notification"
   ```

3. **Restart Supabase Realtime:**
   - This might require Supabase support or a project restart

4. **Check Supabase Version:**
   - Some older Supabase projects might need different setup
   - Check your Supabase project version in Dashboard → Settings

## Quick Fix Script

Run this complete script:

```sql
-- Step 1: Verify table exists
SELECT 'Table exists' as status 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'Notification';

-- Step 2: Add to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";

-- Step 3: Verify it was added
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'Notification';
```

If Step 3 returns a row, it's enabled! Refresh the Replication dashboard.

