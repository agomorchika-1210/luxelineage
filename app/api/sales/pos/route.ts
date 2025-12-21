import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// POST /api/sales/pos - Create POS sale (admin only, reduces stock immediately)
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
    const { items, total } = data

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

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Validate products and check stock
      let calculatedTotal = 0
      const orderItemsData = []

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        })

        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }

        if (product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Required: ${item.quantity}`)
        }

        calculatedTotal += product.price * item.quantity
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price
        })

        // Reduce stock immediately
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        })
      }

      // Create order with PROCESSED status
      const order = await tx.order.create({
        data: {
          source: 'POS',
          status: 'PROCESSED',
          total: calculatedTotal,
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

      // Create sale record
      const sale = await tx.sale.create({
        data: {
          orderId: order.id,
          source: 'POS',
          total: order.total
        }
      })

      return { order, sale }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('POS sale error:', error)
    
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
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

