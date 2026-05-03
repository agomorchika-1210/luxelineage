# P&L Module Audit and Fix Log

Date: 2026-05-01  
Project: `fashion-e-commerce-ui`  
Scope: Admin P&L module (`/admin/pl`) + `/api/pl`

## What I reviewed

UI:
- `app/admin/pl/page.tsx`

API + data model:
- `app/api/pl/route.ts`
- `prisma/schema.prisma` (`Order.discountAmount`, `OrderItem.discount`, `Order.isReturn`)
- `app/api/returns/route.ts` (how returns are created)

## Critical correctness issues found

### 1) Discounts were being treated as COGS

Previously, `/api/pl` added discounts into Net COGS:
- `netCOGS = totalCOGS - returnsCOGS + totalDiscounts`

This is mathematically incorrect for a typical P&L:
- Discounts are **contra-revenue** (they reduce revenue), not an increase in cost of goods.
- The old logic could materially distort gross profit and margins.

### 2) Returns logic used extra client-side filtering

The old `/api/pl` logic:
- fetched all orders and filtered returns client-side via `(order as any).isReturn`
- fetched all sales then filtered returns client-side

The system already creates returns as separate orders with `isReturn: true` (`POST /api/returns`), so we can and should query returns directly and filter sales via relation filtering.

## Fixes implemented

### A) Correct revenue math: Sales - Returns - Discounts

`/api/pl` now computes:
- `totalSales`: sum of sale totals (excluding return orders)
- `returns`: sum of totals for orders where `isReturn = true`
- `discounts`: sum of `order.discountAmount` and `orderItem.discount` for sales orders
- `netRevenue = totalSales - returns - discounts`

Note: The current checkout/POS flows don’t appear to set discounts yet, but the schema supports them; this makes the P&L correct as soon as discounts are introduced.

### B) Correct COGS math: COGS - Returns COGS

`/api/pl` now computes:
- `totalCOGS`: sum of `orderItem.cost * quantity` for sales orders
- `returnsCOGS`: sum of `orderItem.cost * quantity` for return orders
- `netCOGS = totalCOGS - returnsCOGS`

### C) Query sales/returns from the right tables

- Sales are fetched from `prisma.sale.findMany` with `where: { order: { isReturn: false } }`
- Returns are fetched from `prisma.order.findMany` with `where: { isReturn: true }`

Both respect the same date filters (by `createdAt`), matching the rest of the admin reporting pattern.

### D) Updated UI to show discounts under revenue

`/admin/pl` now displays:
- Total Sales
- Returns (negative)
- Discounts (negative)
- Net Revenue

Discounts were removed from the COGS section (they don’t belong there).

## Files changed

- `app/api/pl/route.ts`
- `app/admin/pl/page.tsx`
- `PL_MODULE_AUDIT_AND_FIX_LOG.md` (this file)

## Verification

- IDE lints for edited files: no errors reported.

## Known limitations / follow-ups

- **Discount semantics**: `OrderItem.discount` could be “per-unit” or “per-line”. The API currently treats it as a total per line item. If you define a discount model, we can adjust precisely.
- **Return timing**: Returns are filtered by `createdAt` of the return order. If you want returns to be grouped by `refundedAt`, we can add an option and update UI accordingly.

