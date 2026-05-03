# Inventory Module Audit and Fix Log

Date: 2026-05-01  
Project: `fashion-e-commerce-ui`  
Scope: Admin Inventory module (`/admin/inventory`) + related product APIs

## Why this review matters

Inventory is the source of truth for:
- what can be sold (POS + online)
- stock availability
- cost/price required for P&L accuracy
- low-stock notifications

If inventory writes are inconsistent or not persisted correctly, **sales, accounting, and reporting become unreliable**.

## What I reviewed

UI:
- `app/admin/inventory/page.tsx`

APIs:
- `app/api/products/route.ts` (create/list)
- `app/api/products/[id]/route.ts` (update/delete)
- `app/api/products/[id]/stock/route.ts` (stock adjustment)
- `app/api/products/bulk/route.ts` (bulk import)
- `app/api/images/upload/route.ts` (image upload)

DB / domain behavior:
- `prisma/schema.prisma` (`Product.cost`, `Product.lowStockThreshold`)
- `lib/notifications.ts` (`checkLowStock`)

## Critical issues found (and fixed)

### 1) Low stock threshold was not being persisted

**Severity:** High  
**Impact:** Inventory UI would let you edit `lowStockThreshold`, but the backend ignored it for create/update.  
This breaks the low-stock notification system and causes misleading admin alerts.

Fixes:
- Updated `POST /api/products` to accept + validate `lowStockThreshold`
- Updated `PUT /api/products/[id]` to accept + validate `lowStockThreshold`

Files:
- `app/api/products/route.ts`
- `app/api/products/[id]/route.ts`

### 2) Stock adjustment API trusted unparsed quantity

**Severity:** High  
**Impact:** If `quantity` comes in as a string (common from JSON forms), the route could do incorrect arithmetic or fail unpredictably.

Fix:
- Parse `quantity` safely (string → integer)
- Validate \(quantity > 0\) and return a 400 on invalid input

File:
- `app/api/products/[id]/stock/route.ts`

### 3) “Custom…” Brand/Category UI was broken

**Severity:** Medium-High  
**Impact:** Choosing “Custom…” set the value to `"custom"` and made it hard/impossible to enter the real custom brand/category cleanly.

Fix:
- Added explicit custom-mode state for brand and category
- Select stores `"custom"` only as a UI mode, while the actual value is saved in `formData.brand` / `formData.category`

File:
- `app/admin/inventory/page.tsx`

## Other important findings (recommended improvements)

## Recommended improvements (implemented)

### 1) Server-side pagination + search for products

Implemented a backwards-compatible paged response in `GET /api/products`:
- When no `q/page/pageSize` are provided, the route returns the **original array** response (backwards compatible).
- When `q` and/or pagination params are provided, the route returns:
  - `items`, `total`, `page`, `pageSize`, `q`

Files:
- `app/api/products/route.ts`
- `lib/api-client.ts` (added `productsApi.list()`)

### 2) Inventory UI now uses server-side search + pagination

Inventory table now fetches paginated data using `productsApi.list()` with:
- debounced query
- page navigation buttons
- total count display

File:
- `app/admin/inventory/page.tsx`

### 3) Optimistic stock adjustments

Both quick-adjust buttons and the stock dialog now update UI optimistically and rollback by refetching on error.

File:
- `app/admin/inventory/page.tsx`

### 4) Standardized image uploads via `/api/images/upload`

Inventory no longer uploads directly via `supabase.storage` client. It now calls the existing upload API endpoint.

Also improved the upload API to avoid filename collisions by generating a unique filename per upload.

Files:
- `app/admin/inventory/page.tsx`
- `app/api/images/upload/route.ts`

## Other important findings (still recommended)

### A) Production logging

There are multiple `console.log` statements in inventory and image upload paths.  
Recommendation:
- Gate debug logs behind `process.env.NODE_ENV !== 'production'` or remove them.

### B) Bulk import uses server filesystem reads

`app/api/products/bulk/route.ts` attempts to read images from local disk via `fs` based on an uploaded “imagesFolder”.  
This won’t work reliably in serverless deployments.

Recommendation:
- Prefer zip upload only (already supported) or upload images to storage first, then link by filename.

### C) Inventory uses full product list fetch

`productsApi.getAll()` loads the full catalog. As catalog size grows, inventory will slow down.

Recommendation:
- Add server-side pagination + search params to `/api/products`
- Implement table pagination and query-backed search in UI.

### D) Numeric parsing consistency

UI parses cost/price/stock; API also parses cost/price/stock.  
Recommendation:
- Define a single validation schema (e.g., zod) shared between UI and API.

## What was changed (summary)

Changed:
- `app/admin/inventory/page.tsx`
- `app/api/products/route.ts`
- `app/api/products/[id]/route.ts`
- `app/api/products/[id]/stock/route.ts`

Added:
- `INVENTORY_MODULE_AUDIT_AND_FIX_LOG.md` (this file)

## Verification

- IDE lint check for edited files: no linter errors reported.

## Next steps (to truly “leave no stone unturned”)

1) Add pagination + search to `/api/products` + inventory UI
2) Add optimistic UI updates for stock adjustments (with rollback on failure)
3) Add tests for:
   - create product with `lowStockThreshold`
   - update product `lowStockThreshold`
   - stock adjust rejects string/invalid `quantity`
4) Standardize image upload flow (prefer one path: `uploadImageToSupabase` helper or the `/api/images/upload` endpoint)

