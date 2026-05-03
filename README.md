# Luxelineage

Fashion e-commerce storefront with an admin dashboard (inventory, sales/POS, orders, reporting, P&amp;L, expenses, balance sheet). Built with **Next.js** (App Router), **Prisma** + PostgreSQL, and **Supabase Auth** for admin users.

## Prerequisites

- Node.js 20+ (22 recommended)
- PostgreSQL database (e.g. Supabase)
- Supabase project for authentication

## Setup

1. **Clone and install**

   ```bash
   npm ci
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set `DATABASE_URL`, `DIRECT_URL`, Supabase URL/keys, and `CORS_ALLOW_ORIGINS` for your domains.

3. **Database**

   Apply schema to your database (choose one workflow):

   ```bash
   npx prisma generate
   npx prisma db push
   ```

   For production, prefer versioned migrations once you create them:

   ```bash
   npx prisma migrate dev
   npx prisma migrate deploy
   ```

4. **Prisma client note**

   Always use `npx prisma generate` (default, **with** the query engine). Do **not** use `prisma generate --no-engine` unless you intentionally use Prisma Accelerate with a `prisma://` or `prisma+postgres://` URL; otherwise you will see error **P6001** at runtime.

5. **First admin**

   With an empty `Admin` table, the first successful `/api/auth/login` after Supabase sign-in can bootstrap the first `ADMIN` row (see `app/api/auth/login/route.ts`). Alternatively use `npm run db:seed` or secured signup with `ADMIN_BOOTSTRAP_SECRET`.

6. **Run**

   ```bash
   npm run dev
   ```

   Production:

   ```bash
   npm run build
   npm start
   ```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed admin (see script env vars) |

## Documentation

- **`PRODUCTION_READINESS.md`** — deployment checklist, env vars, auth/stock notes, Paystack/guest tracking/rate limits, and recent production-oriented changes.
- Other audit/fix logs in the repo (`FIXES_LOG.md`, module audit markdown files) capture historical changes.

## Optional: Paystack online checkout

Set `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` and `PAYSTACK_SECRET_KEY`. In the Paystack dashboard, add webhook URL **`https://<your-domain>/api/webhooks/paystack`** (charge.success). Use `NEXT_PUBLIC_APP_URL` so redirect URLs match production. Default currency is **`NGN`** (`PAYSTACK_CURRENCY`).

## Guest order lookup

Customers can open **`/track-order`** with order id and email (same email used at checkout).

## License

Private project — see repository owner.
