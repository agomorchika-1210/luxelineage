import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET /api/orders - List all orders (admin only, can filter by status)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status) {
      where.status = status.toUpperCase()
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true
          }
        },
        sale: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/orders - Create order (from checkout or POS)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { 
      source = 'ONLINE', 
      items, 
      total,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress
    } = data

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      )
    }

    if (!total || total <= 0) {
      return NextResponse.json(
        { error: 'Valid total is required' },
        { status: 400 }
      )
    }

    // Validate products exist and check stock availability
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 400 }
        )
      }
      
      // Check stock availability (only for ONLINE orders, POS handles this separately)
      if (source.toUpperCase() === 'ONLINE' && product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}` },
          { status: 400 }
        )
      }
    }

    // Calculate total to verify
    let calculatedTotal = 0
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })
      if (product) {
        calculatedTotal += product.price * item.quantity
      }
    }

    // Get product prices for order items
    const orderItemsData = await Promise.all(
      items.map(async (item: any) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        })
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: product?.price || item.price || 0
        }
      })
    )

    // Create order
    const order = await prisma.order.create({
      data: {
        source: source.toUpperCase(),
        status: source.toUpperCase() === 'POS' ? 'PROCESSED' : 'PENDING',
        total: calculatedTotal,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        items: {
          create: orderItemsData
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // If POS, create sale immediately
    if (source.toUpperCase() === 'POS') {
      await prisma.sale.create({
        data: {
          orderId: order.id,
          source: 'POS',
          total: order.total
        }
      })
    } else {
      // Create notification for online order (Supabase Realtime will broadcast automatically)
      const { createNotification } = await import('@/lib/notifications')
      await createNotification('ORDER_PLACED', `New order ${order.id} placed`)
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

