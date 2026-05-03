import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import {
  assertOrderTransition,
  describeTransition,
  OrderTransitionError,
} from '@/lib/order-lifecycle'

// POST /api/orders/[id]/process - Process a pending ONLINE order (admin only).
//
// Channel rules (see lib/order-lifecycle.ts):
//   ONLINE: PENDING -> PROCESSED. Stock was already decremented at checkout
//           (POST /api/orders). This step records fulfillment + creates the
//           Sale row used by Sales/P&L reporting. Idempotent: if a Sale
//           already exists for this order it is reused.
//   POS:    rejected. POS orders are created as PROCESSED with stock + Sale
//           in one transaction (POST /api/sales/pos), so they should never
//           hit this endpoint.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          sale: true,
        },
      })

      if (!order) {
        throw new OrderTransitionError('Order not found', 404)
      }

      assertOrderTransition(order, 'process')

      // Atomic + idempotent transition: only succeeds if status is still PENDING.
      const update = await tx.order.updateMany({
        where: { id, status: 'PENDING', source: 'ONLINE' },
        data: { status: 'PROCESSED' },
      })

      if (update.count !== 1) {
        // Either someone else already processed it, or the row changed under us.
        throw new OrderTransitionError(
          'Order is no longer in a state that can be processed.',
          409
        )
      }

      // Idempotent Sale creation — there is a unique constraint on Sale.orderId
      // so we just check first to keep this simple and avoid noisy errors.
      const sale = order.sale
        ? order.sale
        : await tx.sale.create({
            data: {
              orderId: order.id,
              source: order.source,
              total: order.total,
            },
          })

      const updatedOrder = await tx.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      })

      return { order: updatedOrder!, sale, items: order.items }
    })

    // Side-effects after the transaction commits.
    const { createNotification, checkLowStock } = await import('@/lib/notifications')
    await createNotification(
      'ORDER_PROCESSED',
      describeTransition('ONLINE', 'process', result.order.id)
    )

    for (const item of result.items) {
      await checkLowStock(item.productId).catch((err) => {
        console.error('Error checking low stock:', err)
      })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Process order error:', error)

    if (error instanceof OrderTransitionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
