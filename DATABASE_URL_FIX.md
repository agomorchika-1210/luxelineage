# Database Connection Fix

## Problem
Your password contains an `@` symbol (`Jitajkoal@29Luxe`), which conflicts with the `@` separator in PostgreSQL connection strings.

## Solution
URL-encode the `@` symbol in the password as `%40`.

**Before:**
```
postgresql://postgres:Jitajkoal@29Luxe@host:5432/db
```

**After:**
```
postgresql://postgres:Jitajkoal%4029Luxe@host:5432/db
```

## What I Fixed
Updated `.env` file to use `%40` instead of `@` in the password.

## Next Steps
1. **Restart your dev server** (the .env change requires a restart)
2. The connection should work now

## Alternative: Get New Connection String
If this doesn't work, you can get a fresh connection string from Supabase:
1. Go to Supabase Dashboard
2. Settings → Database
3. Connection string → URI
4. Copy the new connection string (it will have the password properly encoded)

