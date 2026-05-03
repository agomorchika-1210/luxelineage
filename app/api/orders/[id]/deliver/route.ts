import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import {
  assertOrderTransition,
  describeTransition,
  OrderTransitionError,
} from '@/lib/order-lifecycle'

// POST /api/orders/[id]/deliver - Mark a SHIPPED ONLINE order as DELIVERED.
//
// DELIVERED is the terminal state for online orders. After this point, any
// further refund/refund-related action must go through the Returns module.
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

    assertOrderTransition(order, 'deliver')

    const update = await prisma.order.updateMany({
      where: { id, status: 'SHIPPED', source: 'ONLINE' },
      data: { status: 'DELIVERED' },
    })

    if (update.count !== 1) {
      throw new OrderTransitionError(
        'Order is no longer in a state that can be delivered.',
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
      'ORDER_DELIVERED',
      describeTransition('ONLINE', 'deliver', id)
    )

    return NextResponse.json(updatedOrder)
  } catch (error: any) {
    console.error('Deliver order error:', error)
    if (error instanceof OrderTransitionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
