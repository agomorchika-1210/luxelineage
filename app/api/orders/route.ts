import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { ApiError, parseJson } from '@/lib/api-helpers'
import { fulfillOrderInTransaction } from '@/lib/online-order'
import type { PaymentStatus as PaymentStatusT } from '@prisma/client'
import { z } from 'zod'

const PAYMENT_STATUS_FILTERS: PaymentStatusT[] = [
  'AWAITING_PAYMENT',
  'PAID',
  'FAILED',
  'REFUNDED',
]

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
  /** How the shopper is paying for ONLINE orders (stored for analytics / reconciliation). */
  paymentMethod: z.enum(['instant_checkout', 'cod']).optional().default('instant_checkout'),
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
    const paymentStatus = searchParams.get('paymentStatus')
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
    if (paymentStatus) {
      const v = paymentStatus.toUpperCase() as PaymentStatusT
      if (PAYMENT_STATUS_FILTERS.includes(v)) {
        where.paymentStatus = v
      }
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
    const {
      source,
      items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      paymentMethod,
    } = data
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

    // ONLINE + POS: decrement stock when the order is committed (same oversell protection).
    const result = await prisma.$transaction(async (tx) => {
      return fulfillOrderInTransaction(tx, {
        idempotencyKey,
        source: normalizedSource,
        items,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        paymentStatus: 'PAID',
        paymentMethod:
          normalizedSource === 'ONLINE' ? paymentMethod : 'pos',
        paystackReference: null,
        decrementStock: true,
      })
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

