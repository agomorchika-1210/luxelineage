import { createHmac } from 'crypto'

const PAYSTACK_API = 'https://api.paystack.co'

export function getPaystackSecretKey(): string | null {
  const k = process.env.PAYSTACK_SECRET_KEY?.trim()
  return k || null
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  )
}

/** Paystack amounts use the smallest currency unit (e.g. kobo for NGN). */
export function majorToPaystackSubunit(amountMajor: number): number {
  return Math.max(1, Math.round(amountMajor * 100))
}

export type PaystackInitializeResponse = {
  status: boolean
  message: string
  data?: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export async function paystackInitialize(params: {
  email: string
  amountSubunit: number
  currency: string
  reference: string
  callbackUrl: string
  metadata: Record<string, string | number | boolean | undefined | null>
}): Promise<PaystackInitializeResponse> {
  const secret = getPaystackSecretKey()
  if (!secret) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured')
  }

  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountSubunit,
      currency: params.currency.toUpperCase(),
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  })

  const json = (await res.json()) as PaystackInitializeResponse
  if (!res.ok || !json.status) {
    throw new Error(json.message || `Paystack initialize failed (${res.status})`)
  }
  return json
}

export type PaystackVerifyData = {
  status: string
  reference: string
  metadata?: Record<string, unknown> | null
  amount?: number
}

export async function paystackVerify(reference: string): Promise<{
  ok: boolean
  message: string
  data?: PaystackVerifyData
}> {
  const secret = getPaystackSecretKey()
  if (!secret) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured')
  }

  const res = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
    }
  )

  const json = (await res.json()) as {
    status: boolean
    message: string
    data?: PaystackVerifyData
  }

  if (!res.ok || !json.status || !json.data) {
    return { ok: false, message: json.message || 'Verification failed' }
  }

  return { ok: true, message: json.message, data: json.data }
}

/**
 * Validates Paystack webhook signature (x-paystack-signature).
 * See https://paystack.com/docs/payments/webhooks
 */
export function verifyPaystackWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = getPaystackSecretKey()
  if (!secret || !signatureHeader) return false

  const hash = createHmac('sha512', secret).update(rawBody).digest('hex')
  return hash === signatureHeader
}
