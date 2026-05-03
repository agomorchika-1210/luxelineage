# Fixes log

This file tracks fixes applied after the review in `PROJECT_REVIEW.md`.

---

## 2026-05-01

### Stock integrity: decrement stock at ONLINE order creation (P0)

**Problem**
- Online orders were created as `PENDING` without reserving/decrementing stock, so the storefront could oversell while waiting for admin “process”.

**Change**
- Updated `POST /api/orders` to **transactionally decrement stock for ONLINE orders** at order creation time.
- Uses a **conditional atomic decrement** per product (`updateMany` with `stockQuantity >= quantity`) so concurrent checkouts can’t both “pass” the stock check.

**Files changed**
- `app/api/orders/route.ts`

**Notes**
- POS flow continues to decrement stock in `POST /api/sales/pos` (no duplication).
- Next steps (still pending): add idempotency for order creation and standardize request schemas.

---

### Reliability: add order idempotency to prevent duplicate orders (P0/P1)

**Problem**
- If the client retries `POST /api/orders` (network issues / reload), the server could create duplicate orders.

**Change**
- Added an optional unique `Order.idempotencyKey`.
- `POST /api/orders` now accepts header `x-idempotency-key`:
  - if an order exists with the key → returns it (HTTP 200)
  - otherwise creates the order and stores the key (HTTP 201)
  - if a race hits the unique constraint, it fetches and returns the existing order.

**Files changed**
- `prisma/schema.prisma`
- `app/api/orders/route.ts`

**Operational note**
- You must run a Prisma migration / apply the schema change to the database so the new column + unique index exist.

---

### Security: lock down admin provisioning (P0)

**Problem**
- `POST /api/auth/signup` could create Supabase users via admin API; if exposed publicly, that’s a critical privilege escalation risk.
- `POST /api/auth/login` was auto-creating an `Admin` record with `ADMIN` role when none existed.

**Change**
- `POST /api/auth/signup` is now **disabled by default** unless `ADMIN_BOOTSTRAP_SECRET` is configured, and the caller provides the secret.
  - Accepted via header: `x-admin-bootstrap-secret`
  - Or body field: `bootstrapSecret`
- `POST /api/auth/login` no longer auto-creates admins. If there is no matching admin record in Prisma, it returns **403 Forbidden**.

**Files changed**
- `app/api/auth/signup/route.ts`
- `app/api/auth/login/route.ts`

**Operational note**
- To create the first admin, either use your seed script (`npm run db:seed`) or temporarily set `ADMIN_BOOTSTRAP_SECRET` and call the signup endpoint with the secret.

---

### API correctness: fix notifications mark-as-read route (P1)

**Problem**
- `PATCH /api/notifications/[id]/read` was implemented in `app/api/notifications/route.ts`, but App Router requires dynamic segments to live in folders.

**Change**
- Moved the mark-as-read handler to the correct route file:
  - `app/api/notifications/[id]/read/route.ts`
- Left `GET /api/notifications` in `app/api/notifications/route.ts`.

**Files changed**
- `app/api/notifications/route.ts`
- `app/api/notifications/[id]/read/route.ts`

---

### Security/ops: restrict CORS to an allowlist (P0)

**Problem**
- All API routes were returning `Access-Control-Allow-Origin: *`, which unnecessarily increases attack surface.

**Change**
- Updated CORS handling to only allow origins listed in the env var `CORS_ALLOW_ORIGINS` (comma-separated).
- If the request has an `Origin` header and it is allowlisted, we echo it back and set `Vary: Origin`.

**Files changed**
- `middleware.ts`

---

### API + frontend correctness: numeric form fields (TypeScript + runtime) (P1)

**Problem**
- Several admin forms stored numeric inputs as strings and passed them directly to API clients, causing TypeScript build failures and potential runtime issues.

**Change**
- Convert numeric strings to numbers (and validate required numeric fields) before calling API methods:
  - Assets/liabilities (balance sheet)
  - Expenses

**Files changed**
- `app/admin/balance-sheet/page.tsx`
- `app/admin/expenses/page.tsx`

---

### TypeScript hardening: re-enable build type checking (P0)

**Problem**
- `typescript.ignoreBuildErrors` was enabled, allowing broken builds to ship.

**Change**
- Set `typescript.ignoreBuildErrors` to `false`.
- Fixed TypeScript build blockers found by `next build`:
  - receipt HTML map implicit `any`
  - wrong `auth` shape in cancel route
  - constant-literal narrowing causing `never` (`shipping` on cart page)
  - header typing in `lib/api-client.ts`
  - invalid Supabase client options (`storage.timeout`)
  - Buffer → Blob conversion for storage uploads
  - Prisma query filter typing (`QueryMode`)
  - bulk import implicit `any` callbacks

**Files changed**
- `next.config.mjs`
- `app/admin/sales/page.tsx`
- `app/api/orders/[id]/cancel/route.ts`
- `app/cart/page.tsx`
- `lib/api-client.ts`
- `lib/supabase-client.ts`
- `lib/supabase.ts`
- `lib/supabase-storage.ts`
- `app/api/products/route.ts`
- `app/api/products/bulk/route.ts`

---

### Cart/stock communication: batch product fetch for cart validation (P2)

**Problem**
- `validateCart()` fetched products one-by-one and updated state inside a loop (slow + multiple renders).

**Change**
- Added `GET /api/products?ids=a,b,c` support.
- Added `productsApi.getByIds(ids)` client helper.
- Updated cart validation to batch fetch and update cart state once.

**Files changed**
- `app/api/products/route.ts`
- `lib/api-client.ts`
- `lib/cart-context.tsx`

---

### Reliability/tooling: ESLint working config for this repo (P2)

**Problem**
- Lint command was non-functional (missing config / TS parser), and Next 16 CLI does not include `next lint`.

**Change**
- Added flat-config ESLint setup that can parse TS/TSX and includes Next + React Hooks rules.

**Files changed**
- `eslint.config.mjs`
- `package.json`

---

### Developer note: Prisma client generation workaround (Windows EPERM)

**Observation**
- `prisma generate` failed on Windows with `EPERM rename query_engine-windows.dll.node...` (file lock).

**Workaround used**
- `npx prisma generate --no-engine` to update Prisma Client TypeScript types without replacing the engine binary.
  - This unblocked TypeScript builds.

---

### Flow integrity: prevent double stock decrement + add checkout idempotency (P0)

**Problem**
- After moving ONLINE stock decrement to `POST /api/orders`, the admin “process order” endpoint still decremented stock again (double-decrement).
- Cancelling a PENDING online order would not restore stock (because stock is now deducted at checkout time).
- Online checkout had no idempotency key, so retries could still duplicate orders.

**Change**
- `POST /api/orders/[id]/process` no longer decrements stock; it only changes status to `PROCESSED` and creates a `Sale`.
- `POST /api/orders/[id]/cancel` now restores stock for `PENDING` orders too.
- `ordersApi.create` now accepts optional `idempotencyKey` and sends header `x-idempotency-key`.
- Checkout generates and uses an idempotency key per attempt (regenerated after failures).

**Files changed**
- `app/api/orders/[id]/process/route.ts`
- `app/api/orders/[id]/cancel/route.ts`
- `lib/api-client.ts`
- `app/checkout/page.tsx`


