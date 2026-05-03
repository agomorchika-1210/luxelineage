import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET /api/returns - Get all returns (admin only)
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      isReturn: true,
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    const returns = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    const totalReturns = returns.reduce((sum, ret) => sum + ret.total, 0)
    const totalRefunds = returns.reduce((sum, ret) => sum + (ret.refundAmount || 0), 0)

    return NextResponse.json({
      returns,
      summary: {
        totalReturns,
        totalRefunds,
        count: returns.length,
      }
    })
  } catch (error: any) {
    console.error('Get returns error:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      name: error?.name
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

// POST /api/returns - Create return/refund (admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { orderId, items, reason, refundAmount } = body

    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, items' },
        { status: 400 }
      )
    }

    // Get original order
    const originalOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!originalOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Calculate return total
      let returnTotal = 0
      const returnItemsData = []

      for (const returnItem of items) {
        const originalItem = originalOrder.items.find(
          (item: any) => item.productId === returnItem.productId
        )

        if (!originalItem) {
          throw new Error(`Item ${returnItem.productId} not found in original order`)
        }

        if (returnItem.quantity > originalItem.quantity) {
          throw new Error(`Return quantity exceeds original order quantity`)
        }

        const itemTotal = originalItem.price * returnItem.quantity
        returnTotal += itemTotal

        returnItemsData.push({
          productId: returnItem.productId,
          quantity: returnItem.quantity,
          price: originalItem.price,
          cost: originalItem.cost,
        })

        // Restore stock
        await tx.product.update({
          where: { id: returnItem.productId },
          data: {
            stockQuantity: {
              increment: returnItem.quantity
            }
          }
        })
      }

      // Create return order
      const returnOrder = await tx.order.create({
        data: {
          source: originalOrder.source,
          status: 'CANCELLED',
          total: returnTotal,
          isReturn: true,
          returnReason: reason,
          refundAmount: refundAmount || returnTotal,
          refundedAt: new Date(),
          cancelledBy: auth.adminId,
          items: {
            create: returnItemsData
          },
          customerId: originalOrder.customerId,
          customerName: originalOrder.customerName,
          customerEmail: originalOrder.customerEmail,
          customerPhone: originalOrder.customerPhone,
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      return returnOrder
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Create return error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

