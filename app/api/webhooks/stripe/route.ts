import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe-server'
import { fulfillOrderInTransaction } from '@/lib/online-order'
import { createNotification } from '@/lib/notifications'

type HoldPayload = {
  idempotencyKey?: string
  items?: { productId: string; quantity: number }[]
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: string
}

export const runtime = 'nodejs'

// POST /api/webhooks/stripe — requires STRIPE_WEBHOOK_SECRET; raw body for signature verification.
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 503 }
    )
  }

  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: import('stripe').Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (err: any) {
    console.error('[stripe webhook] signature:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as import('stripe').Stripe.Checkout.Session
  const sessionId = session.id

  try {
    const existing = await prisma.order.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
    })
    if (existing) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    const holdId = session.metadata?.holdId
    if (!holdId) {
      console.error('[stripe webhook] missing holdId metadata')
      return NextResponse.json({ received: true })
    }

    const hold = await prisma.checkoutSessionHold.findUnique({
      where: { id: holdId },
    })
    if (!hold) {
      console.error('[stripe webhook] hold not found:', holdId)
      return NextResponse.json({ received: true })
    }

    if (hold.expiresAt < new Date()) {
      console.warn('[stripe webhook] hold expired:', holdId)
      await prisma.checkoutSessionHold.delete({ where: { id: hold.id } }).catch(() => {})
      return NextResponse.json({ received: true })
    }

    const payload = hold.payload as HoldPayload

    const items = payload.items
    if (!items?.length) {
      console.error('[stripe webhook] invalid payload')
      return NextResponse.json({ received: true })
    }

    await prisma.$transaction(async (tx) => {
      await fulfillOrderInTransaction(tx, {
        idempotencyKey: payload.idempotencyKey ?? undefined,
        source: 'ONLINE',
        items,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        shippingAddress: payload.shippingAddress,
        paymentStatus: 'PAID',
        paymentMethod: 'stripe_checkout',
        stripeCheckoutSessionId: sessionId,
        decrementStock: true,
      })
      await tx.checkoutSessionHold.delete({ where: { id: hold.id } })
    })

    await createNotification(
      'ORDER_PLACED',
      `New order paid via Stripe (session ${sessionId.slice(0, 10)}…)`
    )

    return NextResponse.json({ received: true })
  } catch (e: any) {
    console.error('[stripe webhook] fulfill error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
