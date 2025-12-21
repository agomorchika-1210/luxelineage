# Supabase Setup Guide

## Prerequisites
- Supabase account and project created
- Database connection string from Supabase dashboard

## Setup Steps

### 1. Get Your Supabase Connection String

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **Database**
3. Find the **Connection string** section
4. Copy the connection string (use the **URI** format)

### 2. Update Environment Variables

Edit the `.env` file and replace the `DATABASE_URL` with your Supabase connection string:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
```

**Important Notes:**
- Replace `[YOUR-PASSWORD]` with your database password
- Replace `[PROJECT-REF]` with your project reference ID
- The `?pgbouncer=true&connection_limit=1` is recommended for serverless/Next.js

### 3. For Migrations (Optional)

If you need to run migrations, you might need a direct connection (without connection pooling):

```env
# For migrations only
DATABASE_URL_DIRECT="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

Then run migrations with:
```bash
DATABASE_URL=$DATABASE_URL_DIRECT npx prisma migrate deploy
```

### 4. Run Database Migrations

Once your `.env` is configured:

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations to create tables in Supabase
npx prisma migrate deploy
```

Or for development:
```bash
npx prisma migrate dev
```

### 5. Verify Connection

You can verify the connection by running:

```bash
npx prisma studio
```

This will open Prisma Studio where you can view and edit your database.

## Supabase Features You Can Use

### Row Level Security (RLS)
Supabase supports Row Level Security. You can enable it later for additional security.

### Real-time Subscriptions
Supabase supports real-time database subscriptions, which can be useful for:
- Live order updates
- Real-time inventory changes
- Notification updates

### Storage
Supabase provides storage for:
- Product images
- User uploads
- Documents

## Security Notes

1. **Never commit your `.env` file** - It contains sensitive credentials
2. **Use environment variables** in production (Vercel, etc.)
3. **Enable RLS** in Supabase for production
4. **Use connection pooling** for serverless functions

## Troubleshooting

### Connection Issues
- Verify your password is correct
- Check if your IP is allowed in Supabase (Settings > Database > Connection Pooling)
- Try the direct connection string for migrations

### Migration Issues
- Use `DATABASE_URL_DIRECT` for migrations
- Ensure you have the correct permissions
- Check Supabase logs for errors

## Next Steps

After setting up Supabase:
1. Run migrations: `npx prisma migrate deploy`
2. Seed admin user: `npm run db:seed`
3. Test the API endpoints
4. Connect your frontend

