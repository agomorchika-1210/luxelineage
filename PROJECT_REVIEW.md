# Project review (real shop readiness)

Date: 2026-05-01  
Repo: `fashion-e-commerce-ui` (Next.js App Router + Prisma + Supabase)

This review focuses on **production readiness for a real shop**, with emphasis on **security, data integrity (stock/orders), operational safety, and correctness**.

---

## Executive summary

You have a solid UI foundation and a surprisingly broad feature surface (storefront + admin + POS + P&L), but there are **several critical issues that must be fixed before real-world use**, especially:

- **Admin/auth security gaps**: public admin signup + “auto-create admin on login” patterns can allow privilege escalation.
- **Order/stock integrity risks**: online order creation does **not** decrement stock; stock is decremented later during “process”, which is risky in real commerce.
- **API surface is not consistently protected or validated** (role checks missing in many places; input validation is inconsistent).
- **Operational config is unsafe**: TypeScript build errors are ignored, and CORS is wide open.

If you address the **Critical P0** items below, the rest becomes manageable and incremental.

---

## P0 (must fix before any real shop use)

### 1) Admin creation & privilege escalation risks

**Where**
- `app/api/auth/signup/route.ts`
- `app/api/auth/login/route.ts`
- `lib/auth-context.tsx`

**What’s wrong**
- `POST /api/auth/signup` appears to be **public** and uses `supabaseAdmin.auth.admin.createUser(...)`. That means **anyone who can hit the endpoint can create an admin user** unless you gate it elsewhere.
- `POST /api/auth/login` **auto-creates an `Admin` record** when it can’t find one, and assigns `role: 'ADMIN'` by default. This is a **very high-risk** pattern: any Supabase user who can obtain a valid access token could become an admin, depending on how/when this endpoint is reachable.

**Fix**
- Make admin provisioning **explicit** and **restricted**:
  - Remove “auto-create admin on login” or at minimum default to lowest privilege and require a server-side allowlist.
  - Protect `POST /api/auth/signup` behind one of:
    - a one-time setup secret (env) for first admin bootstrap, then disable it
    - role-gated “create admin” only callable by an existing ADMIN
    - IP allowlist/VPN for back office + additional checks
- Add **role checks** to *all* admin-modifying endpoints (inventory, POS, users, expenses, etc.) as needed.

---

### 2) CORS is wide open for all API routes

**Where**
- `middleware.ts`

**What’s wrong**
- `Access-Control-Allow-Origin: *` + `Authorization` header allowed means **any website** can call your API from a browser context. While Bearer tokens still protect you, this increases attack surface (token leakage + CSRF-like interactions depending on storage).

**Fix**
- Restrict CORS to known origins (your domain(s)).
- Consider **disabling CORS entirely** if you’re not serving cross-origin clients.

---

### 3) Type safety is disabled in production builds

**Where**
- `next.config.mjs` → `typescript.ignoreBuildErrors: true`

**What’s wrong**
- This allows shipping code with type errors, which tends to correlate with runtime bugs that are hard to debug in production.

**Fix**
- Turn `ignoreBuildErrors` off and resolve underlying type issues.

---

### 4) Online orders do not decrement stock at creation

**Where**
- `app/api/orders/route.ts` (POST)
- `app/api/orders/[id]/process/route.ts` (decrements stock when processed)

**What’s wrong**
- Online order creation checks stock, but **does not reserve/decrement it**.
- Stock is decremented later during admin “process”. In real shops this causes:
  - overselling (two customers checkout against the same stock)
  - “pending orders” that can never be fulfilled

**Fix options**
- **Best**: decrement (reserve) stock inside `POST /api/orders` using a DB transaction and consistent locking semantics.
- **Alternative**: introduce `reservedQuantity` or a StockReservation table with an expiry window.
- In any case, do it in a **single transaction**.

**Important business requirement (what you described)**
- The **client-facing storefront stock** must always reflect the **same stock** used by the **admin/shop POS**.
- When a customer places an online order, the stock shown online should update immediately to avoid overselling.
- When staff sell via POS or adjust inventory in admin, the stock shown online should update immediately.

**Recommended approach for “seamless communication”**
- **Single source of truth**: the database (`Product.stockQuantity` plus optionally reservations).
- **Write paths are transactional**: order create / POS sale / returns / stock adjustments must update stock in one atomic transaction.
- **Read paths are real-time** (optional but ideal):
  - Subscribe the storefront/admin UI to changes (e.g. Supabase Realtime on `products` rows or a derived “inventory events” channel).
  - Fallback: short polling on product pages and at checkout (still keep server-side enforcement).

---

## P1 (high priority improvements)

### 1) Notifications API routing bug (PATCH handler won’t be reachable)

**Where**
- `app/api/notifications/route.ts`

**What’s wrong**
- In Next.js App Router, `app/api/notifications/route.ts` maps to `/api/notifications`.
- A handler that expects `{ params: { id } }` for `/api/notifications/[id]/...` **must live in a dynamic route folder**, e.g.:
  - `app/api/notifications/[id]/read/route.ts` (or similar)

**Impact**
- Mark-as-read likely never works as implemented.

---

### 2) Role checks are inconsistent across admin endpoints

**Where**
- Some routes use `requireRole` (e.g. `app/api/admin/users/*`)
- Many routes only check `requireAuth` (e.g. sales/stock changes may need stricter roles depending on your org)

**Fix**
- Define a clear policy:
  - **ADMIN**: user management, destructive actions, configuration
  - **MANAGER**: inventory adjustments, reports
  - **SALES_PERSON**: POS sales, view-only reports
- Enforce in routes with `requireRole`.

---

### 3) Input validation is “partial” and lacks a single schema

**What I see**
- Some endpoints validate required fields, but there’s no consistent schema across all routes.
- A lot of request parsing uses ad-hoc checks and string operations.

**Fix**
- Use `zod` schemas per route:
  - parse body/query
  - return consistent validation errors
- Normalize enums (`OrderStatus`, `OrderSource`) to prevent accepting arbitrary strings.

---

### 4) Excessive server logging (PII + noise + cost)

**Where**
- `app/api/images/upload/route.ts`
- `app/api/auth/login/route.ts`
- several API routes printing request data

**Risk**
- Logs may contain email addresses, IDs, and operational details.

**Fix**
- Replace with structured logs that:
  - avoid PII
  - are gated by `NODE_ENV !== 'production'` or a `LOG_LEVEL`

---

## P2 (correctness + maintainability)

### 1) Cart validation and performance

**Where**
- `lib/cart-context.tsx`

**Findings**
- `validateCart()` loops items and calls `productsApi.getById()` sequentially.
- It also calls `setItems(...)` *inside* the loop, causing multiple state updates/renders.

**Fix**
- Fetch product data in parallel (or batch endpoint) and update cart state once.
- Consider a `/api/products?ids=...` endpoint for cart validation.

---

### 2) “Total” mismatch between client and server

**Where**
- `app/checkout/page.tsx` sends `total: totalPrice`
- `app/api/orders/route.ts` ignores client total and recalculates `calculatedTotal` (good), but the check `if (!total || total <= 0)` uses the client value.

**Fix**
- Either remove the `total` requirement from request, or treat it as informational only.
- If you keep it, validate `abs(clientTotal - calculatedTotal) <= tolerance` and log discrepancy (but don’t trust client totals).

---

### 3) Customer address parsing is brittle

**Where**
- `app/api/orders/route.ts` splits `shippingAddress` by commas.

**Fix**
- Store structured address fields (address1, city, state, zip, country) instead of parsing a formatted string.

---

### 4) Bulk import endpoint: server filesystem usage and path risks

**Where**
- `app/api/products/bulk/route.ts`

**Findings**
- Accepts `imagesFolder` which can be absolute or relative and reads server disk.
- This is useful locally, but risky/meaningless in production hosting.

**Fix**
- For production, disable local filesystem imports.
- Prefer zipped images upload + server-side extraction, or direct upload to Supabase storage with signed URLs.
- Sanitize any path-like inputs and avoid `fs` access based on user-provided paths.

---

## Config & deployment notes

### Next.js images
**Where**
- `next.config.mjs` sets `images.unoptimized: true`

**Note**
- If you keep standard `<img>` tags and host images on Supabase, that can be fine, but you should ensure:
  - correct caching headers from Supabase
  - responsive image sizes (avoid shipping 1920px everywhere)
  - consistent WebP/AVIF strategy

---

## Suggested “hardening checklist” (copy/paste into tasks)

### Security
- [ ] Remove/lock down `POST /api/auth/signup` (bootstrap-only, admin-only, or secret-gated)
- [ ] Remove “auto-create admin” behavior from `POST /api/auth/login` (or make it safe)
- [ ] Restrict CORS origins in `middleware.ts`
- [ ] Ensure all state-changing admin routes use `requireRole` with correct allowed roles

### Data integrity
- [ ] Reserve/decrement stock on order creation (transactional)
- [ ] Add idempotency for order creation (avoid duplicate orders on retries)
- [ ] Add consistent enum validation for `status`, `source`

### API quality
- [ ] Add `zod` schemas for all request bodies and query params
- [ ] Standardize error response shape (`{ error: string, code?: string }`)
- [ ] Fix notifications PATCH route by moving to a dynamic route file

### Frontend/state
- [ ] Batch cart validation requests; avoid repeated state updates in loops
- [ ] Remove noisy `console.log` from auth state in production

### Build & ops
- [ ] Turn off `typescript.ignoreBuildErrors`
- [ ] Add logging policy (levels + PII redaction)

---

## What I would do next (fastest path to “shop-safe”)

1) **Lock down admin creation** (P0)  
2) **Fix stock reservation/decrement on online checkout** (P0)  
3) Fix **notifications route structure** + role enforcement consistency (P1)  
4) Add `zod` validation to all write endpoints (P1)  
5) Turn TS checks back on and clean up build errors (P0/P1)

