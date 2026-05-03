import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// POST /api/sales/pos - Create an in-store (POS) sale.
//
// This is the canonical entry point for POS:
//   - Validates each line atomically (server-authoritative pricing).
//   - Decrements stock per-line using a conditional update so concurrent sales
//     cannot oversell.
//   - Creates the Order in PROCESSED status (POS terminal state).
//   - Creates the matching Sale row for reporting/P&L.
//   - Optionally validates a client-provided total (anti-tamper).
//   - Emits an ORDER_PROCESSED notification + low-stock checks so the
//     notification feed shows in-store activity alongside online activity.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const { items, total: clientTotal, amountTendered: rawTendered } = data

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      let calculatedTotal = 0
      const orderItemsData: Array<{
        productId: string
        quantity: number
        price: number
        cost: number
      }> = []

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        })

        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }

        const qty = Number(item.quantity)
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error(`Invalid quantity for product ${product.name}`)
        }

        // Atomic conditional decrement — protects against concurrent sales.
        const updated = await tx.product.updateMany({
          where: {
            id: product.id,
            stockQuantity: { gte: qty },
          },
          data: {
            stockQuantity: { decrement: qty },
          },
        })

        if (updated.count !== 1) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Required: ${qty}`
          )
        }

        calculatedTotal += product.price * qty
        orderItemsData.push({
          productId: product.id,
          quantity: qty,
          price: product.price,
          cost: product.cost || 0,
        })
      }

      if (!calculatedTotal || calculatedTotal <= 0) {
        throw new Error('Sale total must be greater than zero')
      }

      // Anti-tamper: if a client total was sent, it must match server pricing.
      if (clientTotal !== undefined && clientTotal !== null && clientTotal !== '') {
        const c = Number(clientTotal)
        if (!Number.isFinite(c) || Math.abs(c - calculatedTotal) > 0.02) {
          throw new Error(
            `Sale total mismatch: expected ${calculatedTotal.toFixed(2)}, got ${clientTotal}`
          )
        }
      }

      let tenderAmount: number | null = null
      let changeAmount: number | null = null
      if (rawTendered !== undefined && rawTendered !== null && rawTendered !== '') {
        const t = Number(rawTendered)
        if (!Number.isFinite(t) || t < 0) {
          throw new Error('Invalid amount tendered')
        }
        if (t + 0.005 < calculatedTotal) {
          throw new Error(
            `Amount tendered (${t.toFixed(2)}) is less than sale total (${calculatedTotal.toFixed(2)})`
          )
        }
        tenderAmount = Math.round(t * 100) / 100
        changeAmount = Math.round((tenderAmount - calculatedTotal) * 100) / 100
      }

      // POS orders are PROCESSED at creation — that is the terminal state for
      // in-store sales. Returns/refunds happen via the Returns module.
      const order = await tx.order.create({
        data: {
          source: 'POS',
          status: 'PROCESSED',
          total: calculatedTotal,
          amountTendered: tenderAmount,
          changeGiven: changeAmount,
          items: { create: orderItemsData },
        },
        include: {
          items: { include: { product: true } },
        },
      })

      const sale = await tx.sale.create({
        data: {
          orderId: order.id,
          source: 'POS',
          total: order.total,
        },
      })

      return { order, sale, items: orderItemsData }
    })

    // Side-effects after the transaction commits — never block the sale on these.
    try {
      const { createNotification, checkLowStock } = await import(
        '@/lib/notifications'
      )
      const tender = result.order.amountTendered
      const chg = result.order.changeGiven
      const payNote =
        tender != null && chg != null
          ? ` — tendered $${tender.toFixed(2)}, change $${chg.toFixed(2)}`
          : ''
      await createNotification(
        'ORDER_PROCESSED',
        `POS sale ${result.order.id} completed (total $${result.order.total.toFixed(2)})${payNote}`
      )
      for (const item of result.items) {
        await checkLowStock(item.productId).catch((err) =>
          console.error('POS low-stock check failed:', err)
        )
      }
    } catch (notifErr) {
      console.error('POS post-sale notification error:', notifErr)
    }

    return NextResponse.json({ order: result.order, sale: result.sale }, { status: 201 })
  } catch (error: any) {
    console.error('POS sale error:', error)

    const msg = typeof error?.message === 'string' ? error.message : ''
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
      const metaColumn =
        typeof error.meta?.column_name === 'string'
          ? error.meta.column_name
          : typeof error.meta?.column === 'string'
            ? error.meta.column
            : null
      const regexColumn = msg.match(/column [`"]?([^`"]+)[`"]? does not exist/i)?.[1] || null
      const missingColumn = metaColumn || regexColumn
      return NextResponse.json(
        {
          error: missingColumn
            ? `Database is missing required column: ${missingColumn}. Apply schema updates (or run add-pos-tender-fields.sql), then restart the dev server.`
            : 'Database schema is missing required columns. Apply schema updates (or run add-pos-tender-fields.sql), then restart the dev server.',
        },
        { status: 503 }
      )
    }

    if (
      msg.includes('amountTendered') ||
      msg.includes('changeGiven') ||
      msg.includes('idempotencyKey') ||
      msg.includes('does not exist')
    ) {
      return NextResponse.json(
        {
          error:
            'Database schema may be out of date. Apply prisma migrations (POS tender fields), then retry.',
        },
        { status: 503 }
      )
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    if (
      error.message?.includes('Insufficient stock') ||
      error.message?.includes('Invalid quantity')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (
      error.message?.includes('Sale total mismatch') ||
      error.message?.includes('Sale total must be greater than zero')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (
      error.message?.includes('Invalid amount tendered') ||
      error.message?.includes('Amount tendered')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
