# Supabase Setup Instructions

## Quick Setup Guide

### Step 1: Create Database Tables

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase-setup.sql`
4. Click **Run** to execute the SQL

This will create:
- All required tables (Admin, Product, Order, OrderItem, Sale, Notification)
- All required enums (OrderSource, OrderStatus, NotificationType)
- All indexes for performance
- Row Level Security (RLS) policies

### Step 2: Create Storage Buckets (Optional)

If you want to upload product images to Supabase Storage:

1. Go to **SQL Editor** again
2. Copy and paste the contents of `supabase-storage-setup.sql`
3. Click **Run** to execute

**OR** use the Dashboard:

1. Go to **Storage** section
2. Click **New bucket**
3. Name: `product-images`
4. Public: **Yes** (so images can be accessed directly)
5. File size limit: **5MB**
6. Allowed MIME types: `image/jpeg, image/jpg, image/png, image/webp, image/gif`
7. Click **Create bucket**

### Step 3: Verify Setup

Run these queries in SQL Editor to verify:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('Admin', 'Product', 'Order', 'OrderItem', 'Sale', 'Notification')
ORDER BY table_name;

-- Check enums
SELECT typname FROM pg_type 
WHERE typname IN ('OrderSource', 'OrderStatus', 'NotificationType');

-- Check storage buckets
SELECT * FROM storage.buckets WHERE id = 'product-images';
```

### Step 4: Update Environment Variables

Make sure your `.env` file has the correct Supabase connection string:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

You can find this in Supabase Dashboard → Settings → Database → Connection string

### Step 5: Run Prisma Migrations (Optional)

If you're using Prisma migrations, you can also run:

```bash
npx prisma migrate deploy
```

This will sync your Prisma schema with the database.

## Important Notes

### Row Level Security (RLS)

The SQL includes RLS policies that:
- Allow public read access to products (for the shop)
- Require authentication for admin operations
- Allow anyone to create orders (for checkout)

**If you need stricter security**, you can modify the policies in `supabase-setup.sql` before running.

### Storage Buckets

The storage bucket is set to **public** so product images can be accessed directly via URL. If you want private storage, change `public` to `false` and update the policies accordingly.

### Firebase Auth Integration

The Admin table uses `firebaseUid` to link with Firebase Authentication. Make sure your Firebase Auth is properly configured in your application.

## Troubleshooting

### "Type already exists" errors
If you see errors about enums already existing, that's okay - the SQL uses `DO $$ BEGIN ... EXCEPTION` to handle this gracefully.

### "Table already exists" errors
If tables already exist, you can either:
1. Drop them first: `DROP TABLE IF EXISTS "TableName" CASCADE;`
2. Or modify the SQL to use `CREATE TABLE IF NOT EXISTS` (already included)

### RLS blocking queries
If RLS is blocking your queries, you can temporarily disable it:
```sql
ALTER TABLE "TableName" DISABLE ROW LEVEL SECURITY;
```
But make sure to re-enable it and set proper policies for production!

## Next Steps

After running the SQL:

1. ✅ Tables created
2. ✅ Indexes created
3. ✅ RLS policies set
4. ✅ Storage bucket ready (if you ran storage SQL)
5. 🔄 Run your application and test!

