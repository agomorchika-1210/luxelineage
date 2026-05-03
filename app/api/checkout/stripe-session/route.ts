import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiError, parseJson } from '@/lib/api-helpers'
import { getStripe, appBaseUrl } from '@/lib/stripe-server'

const BodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  customerName: z.string().optional(),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  shippingAddress: z.string().optional(),
})

// POST /api/checkout/stripe-session — creates Stripe Checkout; stock is decremented in the webhook after payment.
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured (STRIPE_SECRET_KEY missing)' },
      { status: 503 }
    )
  }

  try {
    const idempotencyKey =
      request.headers.get('x-idempotency-key')?.trim() || undefined
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'x-idempotency-key header is required' },
        { status: 400 }
      )
    }

    const data = await parseJson(request, BodySchema)
    const { items, customerName, customerEmail, customerPhone, shippingAddress } =
      data

    const existingOrder = await prisma.order.findUnique({
      where: { idempotencyKey },
    })
    if (existingOrder) {
      return NextResponse.json(
        {
          error: 'Order already created for this idempotency key',
          orderId: existingOrder.id,
        },
        { status: 409 }
      )
    }

    const priorHold = await prisma.checkoutSessionHold.findUnique({
      where: { idempotencyKey },
    })
    if (priorHold) {
      if (priorHold.expiresAt < new Date()) {
        await prisma.checkoutSessionHold.delete({ where: { id: priorHold.id } })
      } else if (priorHold.stripeSessionId) {
        const existing = await stripe.checkout.sessions.retrieve(
          priorHold.stripeSessionId
        )
        if (existing.url && existing.status === 'open') {
          return NextResponse.json({
            url: existing.url,
            sessionId: existing.id,
            resumed: true,
          })
        }
      }
    }

    const productIds = items.map((i) => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    for (const line of items) {
      const p = productMap.get(line.productId)
      if (!p) {
        throw new ApiError(`Product ${line.productId} not found`, 400)
      }
      if (p.stockQuantity < line.quantity) {
        throw new ApiError(
          `Insufficient stock for ${p.name}. Available: ${p.stockQuantity}, requested: ${line.quantity}`,
          400
        )
      }
    }

    const payload = {
      idempotencyKey,
      source: 'ONLINE' as const,
      items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    const hold = await prisma.checkoutSessionHold.create({
      data: {
        idempotencyKey,
        payload: payload as object,
        expiresAt,
      },
    })

    const currency = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase()
    const line_items = items.map((line) => {
      const p = productMap.get(line.productId)!
      return {
        quantity: line.quantity,
        price_data: {
          currency,
          unit_amount: Math.round(p.price * 100),
          product_data: {
            name: p.name,
            metadata: { productId: p.id },
          },
        },
      }
    })

    const base = appBaseUrl()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${base}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout?canceled=1`,
      customer_email: customerEmail,
      client_reference_id: idempotencyKey,
      metadata: {
        holdId: hold.id,
        idempotencyKey,
      },
      line_items,
    })

    await prisma.checkoutSessionHold.update({
      where: { id: hold.id },
      data: { stripeSessionId: session.id },
    })

    if (!session.url) {
      throw new ApiError('Stripe did not return a checkout URL', 500)
    }

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error('[stripe-session]', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
