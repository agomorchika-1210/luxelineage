import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import {
  assertOrderTransition,
  describeTransition,
  OrderTransitionError,
} from '@/lib/order-lifecycle'

// POST /api/orders/[id]/ship - Mark a PROCESSED ONLINE order as SHIPPED.
//
// POS orders cannot be shipped (in-store sales are handed to the customer at
// the counter). The transition is enforced atomically so two concurrent admin
// clicks cannot double-ship the same order.
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

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    assertOrderTransition(order, 'ship')

    const update = await prisma.order.updateMany({
      where: { id, status: 'PROCESSED', source: 'ONLINE' },
      data: { status: 'SHIPPED' },
    })

    if (update.count !== 1) {
      throw new OrderTransitionError(
        'Order is no longer in a state that can be shipped.',
        409
      )
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    })

    const { createNotification } = await import('@/lib/notifications')
    await createNotification(
      'ORDER_SHIPPED',
      describeTransition('ONLINE', 'ship', id)
    )

    return NextResponse.json(updatedOrder)
  } catch (error: any) {
    console.error('Ship order error:', error)
    if (error instanceof OrderTransitionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
