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

## Git and CI

- This branch was pushed to `https://github.com/agomorchika-1210/luxelineage` with production-prep files included.
- In GitHub: **Actions** should run **CI** on the next push; enable Actions for the repository if it is disabled for private repos.

## Suggested improvements (implemented after initial production prep)

This section documents the **feature work** that followed the first “production prep” commit (CI, `.env.example`, README), based on the project review: payments, payment state, guest order access, rate limiting, and a minimal test suite.

| Area | What was added |
|------|----------------|
| **Payment state** | `PaymentStatus` enum on `Order` (`AWAITING_PAYMENT`, `PAID`, `FAILED`, `REFUNDED`), optional `paymentMethod` and `stripeCheckoutSessionId`. `GET /api/orders` supports `?paymentStatus=` for admin filtering. |
| **Shared fulfillment** | `lib/online-order.ts` — `fulfillOrderInTransaction()` used by `POST /api/orders` and the Stripe webhook so stock rules stay in one place. |
| **Stripe Checkout** | `POST /api/checkout/stripe-session` creates a **CheckoutSessionHold** and redirects the browser to Stripe. `POST /api/webhooks/stripe` verifies the signature, creates the `Order` (decrements stock), and sends `ORDER_PLACED`. Requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and (for the button) `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Currency via `STRIPE_CURRENCY` (default `usd`). Redirect base URL: `NEXT_PUBLIC_APP_URL` or `VERCEL_URL`. |
| **Checkout UX** | Checkout replaces fake card fields with **Cash on delivery** vs **Stripe** (when publishable key is set). COD uses `paymentMethod: cod`; Stripe path redirects without clearing the cart until confirmation. |
| **Order confirmation** | After Stripe, `/order-confirmation?session_id=` polls `GET /api/checkout/order-from-session` until the webhook creates the order, then clears the cart and shows the real order id. |
| **Guest tracking** | `GET /api/orders/track?orderId=&email=` and storefront page **`/track-order`**. |
| **Rate limiting** | `lib/rate-limit.ts` + middleware: limits on `POST /api/auth/login`, `POST /api/orders`, `POST /api/checkout/stripe-session` (best-effort; resets on cold start in serverless). |
| **Database** | `CheckoutSessionHold` model; SQL helper `add-payment-checkout-hold.sql` for hosts that do not use `prisma db push`. |
| **Tests** | Vitest + `lib/rate-limit.test.ts`; `npm run test`; CI runs tests before build. |

### Still not implemented (from the review)

- Full **customer accounts** (shopper login) and saved addresses.
- **Transactional email** (Resend / SendGrid).
- **Carrier / shipping labels**.
- **Promotions / coupons** schema and checkout validation.
- **Audit log** for admin actions.

## Known gaps (not in scope of this pass)

- Payment gateway (Stripe/Paystack, etc.) — checkout is still order placement without PSP capture.
- Shopper accounts and order history for customers.
- Email/SMS transactional notifications.
- Full audit log of admin actions.

See earlier project review and `FIXES_LOG.md` for more history.
