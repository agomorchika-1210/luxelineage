# Sales Module Audit and Fix Log

Date: 2026-05-01
Project: `fashion-e-commerce-ui`
Scope: Admin sales module hardening + project-level audit notes

## Why this was started

Primary issues reported:
- SKU/barcode typing in admin sales "Selling" tab was not behaving correctly.
- Suggestive search was not working reliably.
- Admin `Settings` page was linked in sidebar but missing.

Secondary request:
- Perform a broad check and identify where the project needs improvement.
- Document all work done for later review.

## Work completed (chronological)

### 1) Initial project audit pass

Reviewed major admin and API surfaces:
- `app/admin/sales/page.tsx`
- `app/admin/layout.tsx`
- `components/admin-sidebar.tsx`
- `app/api/products/route.ts`
- `app/api/sales/pos/route.ts`
- `lib/api-client.ts`

Key findings:
- Sales SKU input state was too eager and not user-friendly for manual typing/scanner flow.
- Suggestive behavior was incomplete (not true typeahead UX).
- `Settings` route existed in navigation but no page was implemented.
- There are many debug `console.log` usages across admin/API paths.
- Some API code relies heavily on `any` types, raising regression risk.

### 2) Sales typeahead and input behavior fix

Updated `app/admin/sales/page.tsx` to improve SKU/barcode search UX:
- Added suggestion dropdown with keyboard navigation:
  - `ArrowDown` / `ArrowUp` to move highlight
  - `Enter` to select exact/highlighted product
  - `Escape` to close suggestions
- Added ranked suggestion logic (exact SKU prefix prioritization).
- Added `selectProduct()` helper for consistent product selection/reset behavior.
- Improved local loading state updates using functional `setState` patterns to avoid stale merges.

Result:
- Typing now remains stable and visible.
- Suggestive search is interactive and usable.
- POS operator can select by keyboard quickly.

### 3) Added missing admin settings page

Created:
- `app/admin/settings/page.tsx`

Implemented:
- Basic settings UI scaffold with sections:
  - Store profile
  - Sales settings
- Non-destructive placeholder save button (`coming soon`) for future backend wiring.

Result:
- Sidebar `Settings` link now resolves to a valid page.

### 4) Sales hardening pass (stock safety + scanner flow)

Further updates in `app/admin/sales/page.tsx`:
- Added stock-aware helper:
  - `getTotalQuantityInCartForProduct(productId)`
- Enforced stock limits when:
  - Adding selected product to cart
  - Increasing quantity in cart
  - Processing sale (pre-submit stock validation against loaded products)
- Added user feedback toasts for stock violations.
- Made SKU input more scanner-friendly:
  - Strips line breaks from scanned input
  - Auto-selects exact SKU match on input
- Disabled "Add to Cart" when total in-cart quantity reaches stock.

Result:
- Cart can no longer exceed available stock from UI interactions.
- Scanner-style exact SKU entry is faster and more reliable.

### 5) Sales processing logic — ONLINE vs POS clarified and fixed

This is a deeper hardening of the order/sale state model. The full design is
captured in `SALES_PROCESSING_LIFECYCLE.md`; what follows is the change log.

**New canonical state machine** — `lib/order-lifecycle.ts`

- Defines every legal `(channel, current status, action) → next status` transition.
- Exposes `assertOrderTransition`, `describeTransition`, and `nextActionFor`.
- Refuses any modification on `isReturn` orders (Returns module owns those).

**Per-channel transition rules now enforced server-side**

- ONLINE: `PENDING → PROCESSED → SHIPPED → DELIVERED`. Cancellable from any of
  the first three. `DELIVERED` is terminal — refunds go through Returns.
- POS: created already `PROCESSED` (terminal). Only `cancel` is permitted.
  Ship/Deliver actions are now rejected by the API for POS rows.

**Atomic + idempotent transitions** in:

- `app/api/orders/[id]/process/route.ts`
- `app/api/orders/[id]/ship/route.ts`
- `app/api/orders/[id]/deliver/route.ts`
- `app/api/orders/[id]/cancel/route.ts`

Each route now uses a conditional `prisma.order.updateMany({ where: { id, status: <expected>, … } })`.
Two admins clicking the same button at the same time produces exactly one
side-effect; the loser receives `409 Conflict` with a clear message instead
of a silent double update. Sale rows are created idempotently (the route
reuses the existing Sale if present).

**POS endpoint hardened** — `app/api/sales/pos/route.ts`

- Quantity validation per line (`Number.isInteger` + positive check).
- Atomic conditional stock decrement (`updateMany where stockQuantity gte qty`)
  to make the path safe under concurrent POS sales.
- Server-authoritative pricing; if a client total is supplied it must match
  within `$0.02` (anti-tamper).
- Now emits an `ORDER_PROCESSED` notification + runs `checkLowStock` per line
  so in-store activity shows up in the same notification feed as online
  activity, and low-stock alerts fire after every POS sale.

**Admin Sales UI aligned to the new lifecycle** — `app/admin/sales/page.tsx`

- Hide `Ship` and `Deliver` buttons for POS rows (the API would reject them
  anyway; this prevents the user from ever attempting an invalid action).
- Add a `Receipt` action to the Processed Sales tab so cashiers can reprint
  any sale receipt without bouncing through Orders.

**Notifications page recognises every type the API now emits** — `app/admin/notifications/page.tsx`

Added titles + icons for `ORDER_SHIPPED`, `ORDER_DELIVERED`, `ORDER_CANCELLED`,
and `LOW_STOCK`. Previously these were silently rendered with the generic
"Notification" title.

**Inventory invariant restated and verified across the codebase**

> Each unit leaves stock exactly once when an order/sale is created, and is
> restored exactly once if that order is cancelled. Process / Ship / Deliver
> never touch stock.

This is enforced now in code (the new lifecycle helper + the conditional
stock decrements), not just in convention.

## Files changed

- `lib/order-lifecycle.ts` (new)
- `app/api/orders/[id]/process/route.ts`
- `app/api/orders/[id]/ship/route.ts`
- `app/api/orders/[id]/deliver/route.ts`
- `app/api/orders/[id]/cancel/route.ts`
- `app/api/sales/pos/route.ts`
- `app/admin/sales/page.tsx`
- `app/admin/notifications/page.tsx`
- `app/admin/settings/page.tsx`
- `SALES_PROCESSING_LIFECYCLE.md` (new — full lifecycle design doc)

## Verification status

- IDE linter check for edited files: no linter errors reported.
- Project `npm run lint` attempted, but failed because `eslint` is not available in current environment:
  - `'eslint' is not recognized as an internal or external command`

## Remaining improvement recommendations

High priority:
- Add server-validated typed DTOs/zod schemas for sales/order/product APIs.
- Remove or gate production debug logs (`console.log`) behind environment checks.
- Add focused tests for:
  - POS stock guard behavior
  - SKU exact-match selection
  - suggestion keyboard interactions

Medium priority:
- Split large sales page into smaller components/hooks.
- Align search UX patterns across inventory, products, and sales.

Low priority:
- Add debounce for suggestion computation on very large catalogs.
- Improve empty states and inline guidance in admin workflows.

## Suggested next implementation step

Wire persisted settings API and connect `app/admin/settings/page.tsx` fields to backend storage, then add optimistic UI save feedback.

## Related documents

- [`SALES_PROCESSING_LIFECYCLE.md`](./SALES_PROCESSING_LIFECYCLE.md) — canonical
  order lifecycle reference (ONLINE + POS state machines, inventory invariants,
  notifications, concurrency / idempotency notes).
- [`PL_MODULE_AUDIT_AND_FIX_LOG.md`](./PL_MODULE_AUDIT_AND_FIX_LOG.md) — P&L
  module audit, including how discounts and returns are accounted for.
- [`INVENTORY_MODULE_AUDIT_AND_FIX_LOG.md`](./INVENTORY_MODULE_AUDIT_AND_FIX_LOG.md) —
  inventory module audit and improvements.
