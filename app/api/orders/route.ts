import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { ApiError, parseJson } from '@/lib/api-helpers'
import { z } from 'zod'

const OrderCreateSchema = z.object({
  source: z.enum(['ONLINE', 'POS']).optional().default('ONLINE'),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
    })
  ).min(1),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  shippingAddress: z.string().optional(),
})

// GET /api/orders - List orders (admin only, can filter by status).
// Returns are excluded by default so operational order dashboards are not
// polluted by RMA/return records. Pass includeReturns=true to include them.
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
    const source = searchParams.get('source')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search') // Search by customer name/email
    const includeReturns = searchParams.get('includeReturns') === 'true'

    const where: any = {
      isReturn: includeReturns ? undefined : false
    }
    if (status) {
      where.status = status.toUpperCase()
    }
    if (source) {
      where.source = source.toUpperCase()
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
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { customer: { 
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } }
          ]
        }}
      ]
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true
          }
        },
        sale: true,
        customer: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(orders)
  } catch (error: any) {
    console.error('Get orders error:', error)
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

// POST /api/orders - Create order (from checkout or POS)
export async function POST(request: NextRequest) {
  try {
    const idempotencyKey =
      request.headers.get('x-idempotency-key')?.trim() || undefined
    const data = await parseJson(request, OrderCreateSchema)
    const { source, items, customerName, customerEmail, customerPhone, shippingAddress } = data
    const normalizedSource = source

    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
        include: {
          items: { include: { product: true } },
          customer: true,
          sale: true
        }
      })
      if (existing) {
        return NextResponse.json(existing, { status: 200 })
      }
    }

    // Inventory rules by channel (each unit leaves stock exactly once when the order/sale is created):
    // - ONLINE (shop): decrement at checkout so the web store cannot oversell; admin "Process" only
    //   records fulfillment + sale — it does not touch stock again.
    // - POS: also decrement here when this endpoint is used with source POS (legacy). The admin
    //   POS screen should prefer POST /api/sales/pos, which uses the same stock rules in one place.
    const result = await prisma.$transaction(async (tx) => {
      // Fetch all products in a single query for efficiency
      const productIds = items.map((item: any) => item.productId)
      const products = await tx.product.findMany({
        where: { id: { in: productIds } }
      })

      // Create a map for quick lookup
      const productMap = new Map(products.map(p => [p.id, p]))

      // Validate products exist and prepare order items (also compute totals)
      let calculatedTotal = 0
      const orderItemsData = items.map((item: any) => {
        const product = productMap.get(item.productId)
        if (!product) {
          throw new ApiError(`Product ${item.productId} not found`, 400)
        }

        calculatedTotal += product.price * item.quantity
        return {
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
          cost: product.cost || 0
        }
      })

      if (!calculatedTotal || calculatedTotal <= 0) {
        throw new ApiError('Order total must be greater than 0', 400)
      }

      // ONLINE + POS: decrement stock atomically per line (same oversell protection).
      if (normalizedSource === 'ONLINE' || normalizedSource === 'POS') {
        for (const item of orderItemsData) {
          const updated = await tx.product.updateMany({
            where: {
              id: item.productId,
              stockQuantity: { gte: item.quantity }
            },
            data: {
              stockQuantity: { decrement: item.quantity }
            }
          })

          if (updated.count !== 1) {
            const product = productMap.get(item.productId)
            const name = product?.name || item.productId
            const available = product?.stockQuantity
            throw new ApiError(
              `Insufficient stock for ${name}. Available: ${available ?? 'unknown'}, Requested: ${item.quantity}`
              , 400
            )
          }
        }
      }

      // Create or find customer for online orders
      let customerId: string | null = null
      if (normalizedSource === 'ONLINE' && customerEmail) {
        const existingCustomer = await tx.customer.findUnique({
          where: { email: customerEmail }
        })

        if (existingCustomer) {
          customerId = existingCustomer.id
          if (customerName || customerPhone || shippingAddress) {
            const nameParts = customerName?.split(' ') || []
            await tx.customer.update({
              where: { id: customerId },
              data: {
                fullName: customerName || existingCustomer.fullName,
                firstName: nameParts[0] || existingCustomer.firstName,
                lastName: nameParts.slice(1).join(' ') || existingCustomer.lastName,
                phone: customerPhone || existingCustomer.phone,
                ...(shippingAddress && {
                  address: shippingAddress.split(',')[0] || existingCustomer.address,
                  city: shippingAddress.split(',')[1]?.trim() || existingCustomer.city,
                  state: shippingAddress.split(',')[2]?.trim() || existingCustomer.state,
                  zip: shippingAddress.split(',')[3]?.trim() || existingCustomer.zip,
                })
              }
            })
          }
        } else {
          const nameParts = customerName?.split(' ') || []
          const newCustomer = await tx.customer.create({
            data: {
              email: customerEmail,
              phone: customerPhone || null,
              fullName: customerName || 'Unknown',
              firstName: nameParts[0] || null,
              lastName: nameParts.slice(1).join(' ') || null,
              ...(shippingAddress && {
                address: shippingAddress.split(',')[0] || null,
                city: shippingAddress.split(',')[1]?.trim() || null,
                state: shippingAddress.split(',')[2]?.trim() || null,
                zip: shippingAddress.split(',')[3]?.trim() || null,
              })
            }
          })
          customerId = newCustomer.id
        }
      }

      // Create order
      const order = await tx.order.create({
        data: {
          idempotencyKey,
          source: normalizedSource,
          // POS orders created via this endpoint are treated as PROCESSED (legacy path).
          // ONLINE orders start as PENDING.
          status: normalizedSource === 'POS' ? 'PROCESSED' : 'PENDING',
          total: calculatedTotal,
          customerId,
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress,
          items: { create: orderItemsData }
        },
        include: {
          items: { include: { product: true } },
          customer: true
        }
      })

      // If POS, create sale immediately (legacy behavior).
      if (normalizedSource === 'POS') {
        await tx.sale.create({
          data: {
            orderId: order.id,
            source: 'POS',
            total: order.total
          }
        })
      }

      return order
    })

    if (normalizedSource !== 'POS') {
      const { createNotification } = await import('@/lib/notifications')
      await createNotification('ORDER_PLACED', `New order ${result.id} placed`)
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Create order error:', error)
    if ((error as any)?.code === 'P2002') {
      // Unique constraint (likely idempotencyKey). Try to return the existing order.
      const key = request.headers.get('x-idempotency-key')?.trim()
      if (key) {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey: key },
          include: {
            items: { include: { product: true } },
            customer: true,
            sale: true
          }
        })
        if (existing) {
          return NextResponse.json(existing, { status: 200 })
        }
      }
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

