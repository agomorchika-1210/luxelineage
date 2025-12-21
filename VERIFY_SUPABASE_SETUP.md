# ✅ Supabase Setup Verification Checklist

Since Realtime is already enabled, let's verify everything else is set up correctly.

## ✅ Completed
- [x] Realtime enabled for Notification table
- [x] Environment variables configured
- [x] Code migrated from Firebase to Supabase

## 🔍 Quick Verification Steps

### 1. Verify Environment Variables

Check that these are set in your `.env`:
```bash
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
✅ SUPABASE_SECRET_KEY
✅ DATABASE_URL
```

### 2. Test Database Connection

Run Prisma Studio to verify database connection:
```bash
npm run db:studio
```

This should open Prisma Studio and show your tables.

### 3. Verify Table Name

The table name in your Prisma schema is `Notification` (capital N). This should match in Supabase:
- Check in Supabase Dashboard > Database > Tables
- Table should be named exactly `Notification` (not `notification`)

### 4. Test Authentication

1. Create an admin user in Supabase Auth:
   - Dashboard > Authentication > Users > Add User
   - Email: `admin@luxelineage.com`
   - Password: (set a password)
   - Auto Confirm: ✅
   - Copy the User UID

2. Seed the database:
   ```bash
   SUPABASE_ADMIN_UID=your-uid-here npm run db:seed
   ```

3. Test login:
   - Start dev server: `npm run dev`
   - Navigate to `/admin/login`
   - Login with the credentials you created

### 5. Test Realtime Notifications

1. Login to admin panel
2. Open browser DevTools > Console
3. Create a test order or process an existing order
4. You should see:
   - Console log: `Realtime notification update:`
   - Notification badge updates in real-time
   - No page refresh needed

## 🐛 Troubleshooting

### Realtime Not Working?

**Check 1: Table Name Case**
- PostgreSQL is case-sensitive
- Table must be `Notification` (capital N)
- Check in Supabase Dashboard > Database > Tables

**Check 2: Realtime Subscription**
- Open browser console
- Look for WebSocket connection errors
- Check if subscription is established

**Check 3: Verify Realtime is Enabled**
- Dashboard > Database > Replication
- `Notification` table should show as "Active"

### Authentication Not Working?

**Check 1: User Exists**
- Dashboard > Authentication > Users
- Verify admin user exists

**Check 2: Database Link**
- Run seed script again
- Verify UID matches between Auth and Database

**Check 3: API Keys**
- Verify you're using `publishable` and `secret` keys (not `anon`/`service_role`)
- Check in Dashboard > Settings > API

### Database Connection Issues?

**Check Connection String:**
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

**Test with Prisma Studio:**
```bash
npm run db:studio
```

## 🎯 Quick Test Script

You can test the setup by running:

```bash
# 1. Test database connection
npm run db:studio

# 2. Test seed script (after creating user in Supabase Auth)
SUPABASE_ADMIN_UID=your-uid npm run db:seed

# 3. Start dev server
npm run dev
```

## ✨ Expected Behavior

When everything is set up correctly:

1. **Login**: Should work with Supabase Auth credentials
2. **Realtime**: Notifications appear instantly without refresh
3. **Database**: All CRUD operations work via Prisma
4. **No Errors**: No Firebase-related errors in console

## 📝 Next Steps

Once verified:
1. Create admin user in Supabase Auth
2. Run seed script
3. Test the full flow:
   - Login
   - Create order
   - Process order
   - See realtime notification

Everything should work seamlessly with Supabase! 🚀

