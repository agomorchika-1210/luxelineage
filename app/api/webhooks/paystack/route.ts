import { NextRequest, NextResponse } from 'next/server'
import { fulfillPaystackReference } from '@/lib/paystack-fulfill'
import { verifyPaystackWebhookSignature } from '@/lib/paystack-server'

export const runtime = 'nodejs'

type PaystackWebhookBody = {
  event?: string
  data?: {
    reference?: string
    domain?: string
    status?: string
  }
}

// POST /api/webhooks/paystack — verify x-paystack-signature against raw body.
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let body: PaystackWebhookBody
  try {
    body = JSON.parse(rawBody) as PaystackWebhookBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = body.event
  const reference = body.data?.reference

  if (event === 'charge.success' && reference) {
    try {
      await fulfillPaystackReference(reference)
    } catch (e: any) {
      console.error('[paystack webhook] fulfill:', e)
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
