# Fix Prisma Provider Issue

## Problem
Prisma was trying to use SQLite but your database is PostgreSQL (Supabase).

## Solution Applied
Updated `prisma/migrations/migration_lock.toml` to use `postgresql` instead of `sqlite`.

## Next Steps

1. **Stop your dev server** (if running)
   - Press `Ctrl + C` in the terminal running `npm run dev`

2. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Restart your dev server:**
   ```bash
   npm run dev
   ```

## Why This Happened
The migration lock file (`migration_lock.toml`) was set to SQLite from an old migration. This file tells Prisma which database provider to use, and it was overriding the schema.prisma setting.

## Verification
After regenerating, you should see:
- No more SQLite errors
- Prisma client works with PostgreSQL
- Signup and other database operations work

