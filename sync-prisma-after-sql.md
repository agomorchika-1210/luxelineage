# Syncing Prisma After Running SQL Directly

After you run the SQL migration in Supabase, you need to sync Prisma:

## Step 1: Pull the schema from database
```bash
npx prisma db pull
```
This will update your `prisma/schema.prisma` file to match what's in the database.

## Step 2: Generate Prisma Client
```bash
npx prisma generate
```
This updates TypeScript types so your code can use the new tables/fields.

## Alternative: Use CMD instead of PowerShell
If PowerShell execution policy is blocking you, use CMD:
```cmd
cmd /c "npx prisma db pull"
cmd /c "npx prisma generate"
```

## Or fix PowerShell execution policy (one-time)
Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

