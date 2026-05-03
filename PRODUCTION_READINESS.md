# Production readiness (Luxelineage)

This document summarizes what is in place for production, what was added or improved in the production-prep pass, and what you should still do before or after go-live.

## What was added or improved in the production-prep pass

| Item | Description |
|------|-------------|
| **`.env.example`** | Template for all environment variables the app expects (no secrets). Copy to `.env` locally and set the same keys in your host (Vercel, etc.). |
| **`README.md`** | Project overview, install, Prisma note, scripts, pointer to this file. |
| **`.gitignore`** | Stopped ignoring `prisma/migrations` so you can commit migration history when you adopt `prisma migrate` (recommended for production). |
| **`expo-router` removed** | It was an unused dependency; removed to reduce install size and avoid confusion. |
| **`.github/workflows/ci.yml`** | GitHub Actions: `npm ci` → `prisma generate` → `lint` → `build` on push/PR to `main`/`master`. Uses dummy env vars for compile-only. |

## Environment variables (required for production)

| Variable | Role |
|----------|------|
| `DATABASE_URL` | Prisma connection string (often Supabase pooler). |
| `DIRECT_URL` | Direct Postgres URL for migrations when using a pooler. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase public/anon key for the browser client. |
| `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) | Server-only; used for admin client and preferred path in `lib/verify-token.ts`. |
| `CORS_ALLOW_ORIGINS` | Comma-separated list of allowed `Origin` values for browser API calls from other sites (include production URL). |

Optional:

- `ADMIN_BOOTSTRAP_SECRET` — enables controlled admin signup via `/api/auth/signup`.

## Operational notes already implemented in code (prior work)

- **Admin login**: Shared `lib/verify-token.ts` (service key → public key → JWT decode fallback with expiry/issuer checks). `lib/middleware.ts` `requireAuth` uses the same helper.
- **Login route**: `POST /api/auth/login` syncs Supabase user to Prisma `Admin`; email-based UID relink; **zero-admin bootstrap** creates the first admin when the table is empty.
- **Stock**: Online checkout decrements stock in a transaction; order idempotency via `x-idempotency-key`; cart validation batch API.
- **Prisma client**: Use **`npx prisma generate`** without `--no-engine` when using a normal `postgresql://` URL. Using `--no-engine` produces an Accelerate-only client and causes **P6001** unless you use `prisma://` URLs.

## Deployment checklist (you)

1. Set all env vars on the hosting provider; never commit `.env`.
2. Run `npx prisma migrate deploy` (after you have migrations) or `db push` for early staging only.
3. Confirm `npm run build` passes locally with production-like env.
4. Point `CORS_ALLOW_ORIGINS` at your real storefront/admin origins.
5. Ensure `SUPABASE_SERVICE_ROLE_KEY` matches the same Supabase project as `NEXT_PUBLIC_SUPABASE_URL`.
6. Add monitoring (e.g. Sentry), backups, and rate limiting for auth/checkout when you scale.

## Known gaps (not in scope of this pass)

- Payment gateway (Stripe/Paystack, etc.) — checkout is still order placement without PSP capture.
- Shopper accounts and order history for customers.
- Email/SMS transactional notifications.
- Full audit log of admin actions.

See earlier project review and `FIXES_LOG.md` for more history.
