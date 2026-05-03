import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiError, parseJson } from '@/lib/api-helpers'
import {
  appBaseUrl,
  getPaystackSecretKey,
  majorToPaystackSubunit,
  paystackInitialize,
} from '@/lib/paystack-server'

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

/** Matches storefront checkout: 10% tax, free shipping (see app/checkout/page.tsx). */
function totalsFromProducts(
  items: { price: number; quantity: number }[]
): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const tax = subtotal * 0.1
  const total = subtotal + tax
  return { subtotal, tax, total }
}

// POST /api/checkout/paystack/initialize — opens Paystack redirect flow; order created after successful payment.
export async function POST(request: NextRequest) {
  if (!getPaystackSecretKey()) {
    return NextResponse.json(
      { error: 'Paystack is not configured (PAYSTACK_SECRET_KEY missing)' },
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
    const {
      items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
    } = data

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
    if (priorHold && priorHold.expiresAt >= new Date()) {
      if (priorHold.paystackReference) {
        return NextResponse.json(
          {
            error:
              'A Paystack payment is already in progress for this checkout. Complete it or wait for it to expire.',
          },
          { status: 409 }
        )
      }
      await prisma.checkoutSessionHold.delete({ where: { id: priorHold.id } })
    }

    const productIds = items.map((i) => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    const pricedLines: { price: number; quantity: number }[] = []
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
      pricedLines.push({ price: p.price, quantity: line.quantity })
    }

    const { total } = totalsFromProducts(pricedLines)

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    const payload = {
      idempotencyKey,
      source: 'ONLINE' as const,
      items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
    }

    const hold = await prisma.checkoutSessionHold.create({
      data: {
        idempotencyKey,
        payload: payload as object,
        expiresAt,
      },
    })

    const reference = `lux_${hold.id.replace(/-/g, '').slice(0, 22)}_${Date.now()}`.slice(
      0,
      100
    )

    await prisma.checkoutSessionHold.update({
      where: { id: hold.id },
      data: { paystackReference: reference },
    })

    const currency = (process.env.PAYSTACK_CURRENCY || 'NGN').trim()
    const amountSubunit = majorToPaystackSubunit(total)

    const base = appBaseUrl()
    const callbackUrl = `${base}/order-confirmation`

    const init = await paystackInitialize({
      email: customerEmail,
      amountSubunit,
      currency,
      reference,
      callbackUrl,
      metadata: {
        holdId: hold.id,
        idempotencyKey,
      },
    })

    const authorizationUrl = init.data?.authorization_url
    if (!authorizationUrl) {
      throw new ApiError('Paystack did not return authorization_url', 500)
    }

    return NextResponse.json({
      authorizationUrl,
      reference,
    })
  } catch (error: any) {
    console.error('[paystack initialize]', error)
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
