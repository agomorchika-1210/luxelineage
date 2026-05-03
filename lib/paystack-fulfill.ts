import { prisma } from '@/lib/prisma'
import { fulfillOrderInTransaction } from '@/lib/online-order'
import { paystackVerify } from '@/lib/paystack-server'
import { createNotification } from '@/lib/notifications'

/**
 * Idempotent: creates Order + decrements stock once Paystack reports success.
 * Safe to call from redirect polling and from webhooks.
 */
export async function fulfillPaystackReference(reference: string) {
  const existing = await prisma.order.findUnique({
    where: { paystackReference: reference },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  })
  if (existing) {
    return { order: existing, created: false as const }
  }

  const verified = await paystackVerify(reference)
  if (!verified.ok || !verified.data) {
    return { pending: true as const, reason: verified.message }
  }

  if (verified.data.status !== 'success') {
    return { pending: true as const, reason: `status:${verified.data.status}` }
  }

  const meta = verified.data.metadata as Record<string, unknown> | null | undefined
  let holdId = typeof meta?.holdId === 'string' ? meta.holdId : undefined

  let hold = holdId
    ? await prisma.checkoutSessionHold.findUnique({ where: { id: holdId } })
    : null

  if (!hold) {
    hold = await prisma.checkoutSessionHold.findUnique({
      where: { paystackReference: reference },
    })
    holdId = hold?.id
  }

  if (!hold) {
    console.error('[paystack] could not resolve hold for reference', reference)
    return { pending: true as const, reason: 'hold_not_found' }
  }

  if (hold.expiresAt < new Date()) {
    await prisma.checkoutSessionHold.delete({ where: { id: hold.id } }).catch(() => {})
    return { pending: true as const, reason: 'hold_expired' }
  }

  const payload = hold.payload as {
    idempotencyKey?: string
    items?: { productId: string; quantity: number }[]
    customerName?: string
    customerEmail?: string
    customerPhone?: string
    shippingAddress?: string
  }

  const items = payload.items
  if (!items?.length) {
    throw new Error('Invalid checkout hold payload')
  }

  const order = await prisma.$transaction(async (tx) => {
    const o = await fulfillOrderInTransaction(tx, {
      idempotencyKey: payload.idempotencyKey ?? undefined,
      source: 'ONLINE',
      items,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      shippingAddress: payload.shippingAddress,
      paymentStatus: 'PAID',
      paymentMethod: 'paystack',
      paystackReference: reference,
      decrementStock: true,
    })
    await tx.checkoutSessionHold.delete({ where: { id: hold.id } })
    return o
  })

  await createNotification(
    'ORDER_PLACED',
    `New order ${order.id} paid via Paystack (${reference.slice(0, 12)}…)`,
  )

  return { order, created: true as const }
}
