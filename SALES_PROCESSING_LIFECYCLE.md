# Sales Processing Lifecycle

This document is the single source of truth for how an order/sale moves
through the system, who is responsible for each transition, and how
inventory + reporting stay consistent across both sales channels.

It is modeled on patterns used in real-world retail/e-commerce platforms:

- **Shopify**: separates the sales channel (Online Store vs POS) and uses an
  order status machine (`pending` → `paid/fulfilled` → `shipped` → `delivered`).
- **WooCommerce**: states `pending` → `processing` → `completed` (+ `cancelled`,
  `refunded`).
- **Square**: in-store sales are completed at the counter; refunds are
  recorded against the original sale.
- **Stripe + OMS**: payment is captured first, fulfillment is a separate
  state machine, and cancellations after shipment go through an RMA flow.

We follow the same shape here, simplified to the two channels we operate:
**ONLINE** (web shop, customer-initiated) and **POS** (in-store, admin-initiated).

---

## 1. The State Machine

The canonical machine lives in `lib/order-lifecycle.ts`. Every API route that
mutates an order's status routes through `assertOrderTransition(order, action)`
so behavior is consistent and auditable.

### 1.1 ONLINE (Web shop, customer-initiated)

```
                       customer pays at checkout
                                │
                                ▼
                     ┌───────────────────┐
                     │      PENDING      │ ← stock decremented here
                     └───────────────────┘
                                │ admin reviews / payment confirmed
                                ▼  (POST /api/orders/[id]/process)
                     ┌───────────────────┐
                     │     PROCESSED     │ ← Sale row created here
                     └───────────────────┘
                                │ packed + handed to courier
                                ▼  (POST /api/orders/[id]/ship)
                     ┌───────────────────┐
                     │      SHIPPED      │
                     └───────────────────┘
                                │ customer receives
                                ▼  (POST /api/orders/[id]/deliver)
                     ┌───────────────────┐
                     │     DELIVERED     │  terminal
                     └───────────────────┘

   Cancellable from PENDING / PROCESSED / SHIPPED → CANCELLED
   (restocks each line, removes the Sale row)
   DELIVERED orders cannot be cancelled — must use the Returns module.
```

**Stock rule (ONLINE):** decremented exactly once at **checkout**
(`POST /api/orders` with `source=ONLINE`). Subsequent transitions never touch
stock again unless the order is cancelled, which restocks every line.

### 1.2 POS (In-store, admin-initiated)

```
                  cashier rings up cart at counter
                                │
                                ▼  (POST /api/sales/pos)
                     ┌───────────────────┐
                     │     PROCESSED     │ ← terminal for POS
                     └───────────────────┘   (stock + Sale created here)

   Cancellable from PROCESSED → CANCELLED
   (restocks each line, removes the Sale row)
   For monetary refund/customer-facing return, use the Returns module.
```

**Stock rule (POS):** decremented exactly once at **sale creation**
(`POST /api/sales/pos`). The order is created already in `PROCESSED` and is
considered complete — POS does not have a Ship/Deliver step because the
customer leaves with the goods.

### 1.3 Returns (RMA)

Returns are recorded as a **separate** Order with `isReturn = true` and status
`CANCELLED`. They live in their own module (`/admin/returns`) and:

- **Increment** stock at creation (the items came back).
- Are **immutable** through the order routes — `assertOrderTransition`
  refuses any action on `isReturn` orders so the original sale is preserved.
- Feed into P&L as a contra-revenue line.

---

## 2. What Happens at Each Transition

### 2.1 ONLINE checkout — `POST /api/orders` (source=ONLINE)

1. Validate cart, look up products, compute server-authoritative total.
2. **Atomic conditional decrement** of stock per line — if any line cannot be
   satisfied, the entire transaction rolls back and we return `400` with the
   offending product name + amount available. This prevents oversell under
   concurrency (two customers fighting for the last unit).
3. Create or upsert the `Customer` record from the email.
4. Create the `Order` with `status = PENDING`.
5. Idempotency: if the request includes `x-idempotency-key`, that key is
   stored on the order. Re-submitting the same key returns the existing order
   instead of creating a duplicate.
6. Emit `ORDER_PLACED` notification.

### 2.2 Admin processes — `POST /api/orders/[id]/process`

1. Load the order. Reject if missing.
2. `assertOrderTransition(order, 'process')` — must be `ONLINE` + `PENDING`,
   not a return order.
3. **Atomic conditional update** to flip status from `PENDING → PROCESSED`.
   If the row no longer matches (e.g. another admin already clicked
   Process), respond `409 Conflict`. This makes the call idempotent and
   safe under concurrency.
4. Idempotently create the `Sale` row (one Sale per Order via the unique
   `Sale.orderId`).
5. Run `checkLowStock` for each line — fires `LOW_STOCK` notification if
   any product is at/under its threshold.
6. Emit `ORDER_PROCESSED` notification.

### 2.3 Admin ships — `POST /api/orders/[id]/ship`

1. Load + assert: `ONLINE` + `PROCESSED` + not a return.
2. Atomic update `PROCESSED → SHIPPED`. `409` on conflict.
3. Emit `ORDER_SHIPPED` notification.

### 2.4 Admin marks delivered — `POST /api/orders/[id]/deliver`

1. Load + assert: `ONLINE` + `SHIPPED` + not a return.
2. Atomic update `SHIPPED → DELIVERED`. `409` on conflict.
3. Emit `ORDER_DELIVERED` notification.

### 2.5 POS sale — `POST /api/sales/pos`

1. Validate cart line-by-line; reject invalid quantities.
2. **Atomic conditional decrement** of stock per line (same as ONLINE).
3. Compute server-authoritative total.
4. If the client supplied a `total`, it must match within `$0.02` —
   otherwise `400 Sale total mismatch` (anti-tamper).
5. Create the `Order` (status `PROCESSED`, source `POS`) and the matching
   `Sale` row in the same transaction.
6. After commit: emit `ORDER_PROCESSED` notification ("POS sale … completed
   ($X)") and run `checkLowStock` per line.

### 2.6 Cancel — `POST /api/orders/[id]/cancel`

1. Load order. Reject if missing or already cancelled. Return orders
   (`isReturn = true`) are refused outright.
2. `assertOrderTransition(order, 'cancel')`:
   - ONLINE: must be `PENDING` / `PROCESSED` / `SHIPPED`.
   - POS: must be `PROCESSED`.
   - DELIVERED: refused — use the Returns module.
3. **Atomic update** to `CANCELLED` (only succeeds if the row is still in
   the expected state, otherwise `409`).
4. **Restock** each line via `increment`.
5. Delete the `Sale` row if present, so it does not double-count in
   sales/P&L. (The Returns module is responsible for recording the
   refund as a separate event.)
6. Emit `ORDER_CANCELLED` notification (channel-aware copy).

---

## 3. Inventory Invariant (Important)

> **Each unit of stock leaves inventory exactly once when an order/sale is
> created, and is restored exactly once if that order is cancelled.**

| Channel  | Decrement at                | Restock at                          |
|----------|-----------------------------|-------------------------------------|
| ONLINE   | `POST /api/orders`          | `POST /api/orders/[id]/cancel`      |
| POS      | `POST /api/sales/pos`       | `POST /api/orders/[id]/cancel`      |
| Returns  | (incremented at return creation, in the Returns route)            |

**Process / Ship / Deliver never modify stock.** They only advance the
fulfillment state for ONLINE orders.

The conditional `updateMany({ where: { stockQuantity: { gte: qty } } })`
pattern protects against oversell when two transactions race for the same
last unit, and it makes the entire call idempotent at the DB level.

---

## 4. Sale Records and P&L

- A `Sale` row is the canonical record used by the admin Sales tab and the
  P&L module. It is created:
  - On `POST /api/sales/pos` (POS).
  - On `POST /api/orders/[id]/process` (ONLINE), once admin approves.
- A Sale is removed only when its order is cancelled. Returns are tracked
  separately via `isReturn` orders so the original sale stays intact.
- Discounts are stored on `Order.discountAmount` and on each `OrderItem.discount`,
  and are treated as contra-revenue by the P&L API (see `PL_MODULE_AUDIT_AND_FIX_LOG.md`).

---

## 5. Notifications (Inter-module Communication)

The notification feed is the connective tissue between modules. Every
state-changing action emits exactly one user-facing notification, persisted
to Supabase and broadcast via Realtime so all admin tabs stay in sync.

| Event                              | Notification type   | Where the consumer sees it          |
|------------------------------------|---------------------|--------------------------------------|
| Customer places ONLINE order       | `ORDER_PLACED`      | Notifications page, Sales > Orders   |
| Admin processes ONLINE order       | `ORDER_PROCESSED`   | Notifications, Sales > Processed     |
| Admin ships ONLINE order           | `ORDER_SHIPPED`     | Notifications                        |
| Admin marks ONLINE order delivered | `ORDER_DELIVERED`   | Notifications                        |
| Admin cancels ONLINE / POS order   | `ORDER_CANCELLED`   | Notifications                        |
| POS sale completed                 | `ORDER_PROCESSED`   | Notifications, Sales > Processed     |
| Stock at/under threshold           | `LOW_STOCK`         | Notifications, Inventory             |

The admin Notifications page renders icons + titles for every type listed
above. Low-stock checks run after every transition that consumes stock
(checkout, POS sale, process), so an item dropping below its threshold is
flagged immediately to whoever is on shift — not on the next inventory load.

---

## 6. Concurrency, Idempotency, and Safety

Areas we explicitly hardened (and why they matter in production):

1. **Atomic transitions.** Every status change uses
   `prisma.order.updateMany({ where: { id, status: <expected>, … } })`. If
   two admins click "Ship" at the same time, exactly one update wins and the
   loser receives `409 Conflict` with a clear message. There is no double
   side-effect.
2. **Atomic stock decrement.** Stock changes use a conditional
   `updateMany({ where: { stockQuantity: { gte: qty } } })`. Two simultaneous
   sales for the last unit cannot both succeed.
3. **Idempotent ONLINE checkout.** `x-idempotency-key` request header maps
   to `Order.idempotencyKey` (unique). Resubmitting the same payload returns
   the existing order instead of a new one — protects mobile/web clients
   from creating duplicate orders on retry.
4. **Idempotent Sale creation on Process.** `Sale.orderId` is unique. The
   process route reuses the existing Sale row if present rather than
   throwing on the unique constraint.
5. **Server-authoritative totals.** Both the ONLINE and POS endpoints compute
   the order total from the products table. POS additionally validates any
   client-supplied total within `$0.02` to catch tampered or stale carts.
6. **Channel-aware UI.** The admin Sales > Orders tab now hides the Ship and
   Deliver buttons for POS rows (POS is already complete at the counter), so
   admins cannot send invalid transitions that would just bounce off the API.

---

## 7. End-to-End Trace (Online order example)

```
Browser                Server                            DB / Supabase
───────                ──────                            ─────────────
checkout submit  ──►  POST /api/orders  (source=ONLINE)
                       │ tx: validate, decrement stock
                       │     create customer (upsert)
                       │     create order PENDING
                       │ commit  ─────────────────────►  Order { status: PENDING }
                       │ ORDER_PLACED notification ───►  Notification (Realtime)
                       ◄── 201 + order
admin opens Sales/Orders ────► sees the order (PENDING badge)

admin clicks Process ─►  POST /api/orders/[id]/process
                          │ tx: assert (ONLINE+PENDING, not return)
                          │     updateMany PENDING→PROCESSED (count===1)
                          │     create Sale (idempotent)
                          │ commit  ────────────────►  Order PROCESSED + Sale
                          │ checkLowStock per line (may emit LOW_STOCK)
                          │ ORDER_PROCESSED notification ─►  Notification
                          ◄── 200

admin clicks Ship    ─►  POST /api/orders/[id]/ship
                          │ updateMany PROCESSED→SHIPPED + ORDER_SHIPPED
admin clicks Deliver ─►  POST /api/orders/[id]/deliver
                          │ updateMany SHIPPED→DELIVERED + ORDER_DELIVERED
```

POS is the single-step variant of the same machine:

```
admin POS UI   ──►  POST /api/sales/pos
                    │ tx: validate, decrement stock per line
                    │     create Order PROCESSED + Sale
                    │ commit
                    │ ORDER_PROCESSED notification + low-stock checks
                    ◄── 201
```

---

## 8. Files Involved (Code map)

| File                                       | Role                                                  |
|--------------------------------------------|-------------------------------------------------------|
| `lib/order-lifecycle.ts`                   | Canonical state machine, transition assertions.       |
| `app/api/orders/route.ts`                  | Online checkout (creates PENDING order, decrements stock). |
| `app/api/sales/pos/route.ts`               | POS sale (creates PROCESSED order + Sale + stock).    |
| `app/api/orders/[id]/process/route.ts`     | ONLINE PENDING → PROCESSED + Sale.                    |
| `app/api/orders/[id]/ship/route.ts`        | ONLINE PROCESSED → SHIPPED.                           |
| `app/api/orders/[id]/deliver/route.ts`     | ONLINE SHIPPED → DELIVERED.                           |
| `app/api/orders/[id]/cancel/route.ts`      | ANY → CANCELLED (restock + drop Sale).                |
| `app/api/orders/[id]/receipt/route.ts`     | Generates a printable receipt for any order.          |
| `app/admin/sales/page.tsx`                 | Sales UI: Selling (POS), Orders, Processed Sales.     |
| `app/admin/notifications/page.tsx`         | Notification feed; recognises every type emitted.     |
| `lib/notifications.ts`                     | Notification + low-stock helpers.                     |

---

## 9. Limitations / Known Gaps

These are intentionally out of scope for this iteration but worth tracking:

- **Payment capture.** We assume payment was successful at checkout. Adding a
  proper payment provider (Stripe/Paystack) would introduce `PAID` and
  `PAYMENT_FAILED` states between PENDING and PROCESSED.
- **Audit log.** We store `cancelledAt` / `cancelledBy` / `cancellationReason`
  but not a full per-transition audit trail. A dedicated `OrderEvent` table
  would close that gap.
- **Partial fulfillment.** Today an order ships in one piece. Multi-shipment
  orders would need an `OrderShipment` table and per-line ship state.
- **Backorders.** Today insufficient stock blocks the sale. Allowing a
  backorder mode would require a separate flag and a "fulfill when restocked"
  job.

These gaps do not break the current invariants; they extend them.
