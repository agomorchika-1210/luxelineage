import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/checkout/order-from-session?session_id=cs_...
// Used after Stripe redirect while webhook may still be processing.
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')?.trim()
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  })

  if (!order) {
    return NextResponse.json({ pending: true })
  }

  return NextResponse.json({ pending: false, order })
}
