import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// POST /api/orders/[id]/process - Process a pending order (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Fetch order
      const order = await tx.order.findUnique({
        where: { id: params.id },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      if (!order) {
        throw new Error('Order not found')
      }

      if (order.status !== 'PENDING') {
        throw new Error('Order is not pending')
      }

      // Check stock availability and reduce stock
      for (const item of order.items) {
        const product = item.product
        if (product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Required: ${item.quantity}`)
        }

        // Reduce stock
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        })
      }

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: params.id },
        data: {
          status: 'PROCESSED'
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      // Create sale record
      const sale = await tx.sale.create({
        data: {
          orderId: updatedOrder.id,
          source: updatedOrder.source,
          total: updatedOrder.total
        }
      })


      return { order: updatedOrder, sale }
    })

    // Create notification after transaction (Supabase Realtime will broadcast automatically)
    const { createNotification } = await import('@/lib/notifications')
    await createNotification('ORDER_PROCESSED', `Order ${result.order.id} has been processed`)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Process order error:', error)
    
    if (error.message === 'Order not found') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    if (error.message === 'Order is not pending') {
      return NextResponse.json(
        { error: 'Order is not pending' },
        { status: 400 }
      )
    }
    
    if (error.message.includes('Insufficient stock')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

