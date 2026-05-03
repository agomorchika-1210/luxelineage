import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET /api/orders/[id]/receipt - Generate receipt/invoice for order (admin only)
export async function GET(
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

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        sale: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Generate receipt data
    const receipt = {
      orderId: order.id,
      orderNumber: `ORD-${order.id.substring(0, 8).toUpperCase()}`,
      date: order.createdAt.toISOString(),
      status: order.status,
      source: order.source,
      customer: {
        name: order.customer?.fullName || order.customerName || 'Walk-in Customer',
        email: order.customer?.email || order.customerEmail || null,
        phone: order.customer?.phone || order.customerPhone || null,
        address: order.customer?.address || order.shippingAddress || null,
      },
      items: order.items.map(item => ({
        name: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.price * item.quantity,
      })),
      subtotal: order.total,
      tax: 0, // Add tax calculation if needed
      shipping: 0, // Add shipping calculation if needed
      total: order.total,
      paymentMethod: order.source === 'POS' ? 'Cash/Card' : 'Online',
      saleId: order.sale?.id || null,
      amountTendered:
        order.amountTendered != null ? order.amountTendered : null,
      changeGiven: order.changeGiven != null ? order.changeGiven : null,
    }

    return NextResponse.json(receipt)
  } catch (error: any) {
    console.error('Generate receipt error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

