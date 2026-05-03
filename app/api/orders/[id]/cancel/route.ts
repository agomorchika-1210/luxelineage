import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import {
  assertOrderTransition,
  describeTransition,
  OrderTransitionError,
} from '@/lib/order-lifecycle'

// POST /api/orders/[id]/cancel - Cancel an order (admin only).
//
// Channel rules (see lib/order-lifecycle.ts):
//   ONLINE: PENDING / PROCESSED / SHIPPED -> CANCELLED. Stock is restored
//           per-line and the Sale row (if any) is removed so reporting/P&L
//           do not double-count.
//   POS:    PROCESSED -> CANCELLED. Same restock + sale removal. After this
//           use the Returns module to record the refund.
//   DELIVERED orders cannot be cancelled — they must use the Returns flow.
//   Return orders (isReturn=true) are immutable here.
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

    const data = await request.json().catch(() => ({}))
    const { reason, refundAmount } = data

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

      assertOrderTransition(order, 'cancel')

      // Atomic transition. If two admins click Cancel at once, only one wins.
      const update = await tx.order.updateMany({
        where: {
          id,
          status: order.status,
          isReturn: false,
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: auth.adminId,
          cancellationReason: reason || null,
          refundAmount: refundAmount || order.total,
          refundedAt: refundAmount ? new Date() : null,
        },
      })

      if (update.count !== 1) {
        throw new OrderTransitionError(
          'Order is no longer in a state that can be cancelled.',
          409
        )
      }

      // Restore stock. Stock was deducted at order creation (ONLINE checkout
      // or POS sale time), so any non-cancelled status implies stock is "out".
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        })
      }

      // Remove the Sale row if it exists. Cancelled orders should not show in
      // sales/P&L reporting — that is the job of the Returns module instead.
      if (order.sale) {
        await tx.sale.delete({ where: { orderId: order.id } })
      }

      const updatedOrder = await tx.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      })

      return updatedOrder!
    })

    const { createNotification } = await import('@/lib/notifications')
    await createNotification(
      'ORDER_CANCELLED',
      describeTransition(result.source, 'cancel', result.id)
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Cancel order error:', error)

    if (error instanceof OrderTransitionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
