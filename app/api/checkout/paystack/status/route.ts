import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fulfillPaystackReference } from '@/lib/paystack-fulfill'

// GET /api/checkout/paystack/status?reference=
export async function GET(request: NextRequest) {
  const reference =
    request.nextUrl.searchParams.get('reference')?.trim() ||
    request.nextUrl.searchParams.get('trxref')?.trim()

  if (!reference) {
    return NextResponse.json(
      { error: 'reference query parameter is required' },
      { status: 400 }
    )
  }

  const existing = await prisma.order.findUnique({
    where: { paystackReference: reference },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  })

  if (existing) {
    return NextResponse.json({ pending: false, order: existing })
  }

  try {
    const result = await fulfillPaystackReference(reference)
    if ('order' in result && result.order) {
      return NextResponse.json({ pending: false, order: result.order })
    }
    return NextResponse.json({
      pending: true,
      reason: 'reason' in result ? result.reason : undefined,
    })
  } catch (e: any) {
    console.error('[paystack status]', e)
    return NextResponse.json(
      { error: e.message || 'Fulfillment failed', pending: false },
      { status: 500 }
    )
  }
}
