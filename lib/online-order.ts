import type { Prisma, PaymentStatus, OrderSource } from '@prisma/client'
import { ApiError } from '@/lib/api-helpers'

export type OnlineOrderLine = { productId: string; quantity: number }

export type FulfillOnlineOrderArgs = {
  idempotencyKey?: string | null
  source: OrderSource
  items: OnlineOrderLine[]
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  shippingAddress?: string | null
  paymentStatus: PaymentStatus
  paymentMethod?: string | null
  stripeCheckoutSessionId?: string | null
  /** When false, stock is not touched (unused today; reserved for reservations). */
  decrementStock: boolean
}

/**
 * Shared transactional path for creating an order with optional stock decrement.
 * Used by POST /api/orders and Stripe webhook fulfillment.
 */
export async function fulfillOrderInTransaction(
  tx: Prisma.TransactionClient,
  args: FulfillOnlineOrderArgs
) {
  const {
    source: normalizedSource,
    items,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    paymentStatus,
    paymentMethod,
    stripeCheckoutSessionId,
    decrementStock,
    idempotencyKey,
  } = args

  const productIds = items.map((item) => item.productId)
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
  })

  const productMap = new Map(products.map((p) => [p.id, p]))

  let calculatedTotal = 0
  const orderItemsData = items.map((item) => {
    const product = productMap.get(item.productId)
    if (!product) {
      throw new ApiError(`Product ${item.productId} not found`, 400)
    }

    calculatedTotal += product.price * item.quantity
    return {
      productId: product.id,
      quantity: item.quantity,
      price: product.price,
      cost: product.cost || 0,
    }
  })

  if (!calculatedTotal || calculatedTotal <= 0) {
    throw new ApiError('Order total must be greater than 0', 400)
  }

  if (
    decrementStock &&
    (normalizedSource === 'ONLINE' || normalizedSource === 'POS')
  ) {
    for (const item of orderItemsData) {
      const updated = await tx.product.updateMany({
        where: {
          id: item.productId,
          stockQuantity: { gte: item.quantity },
        },
        data: {
          stockQuantity: { decrement: item.quantity },
        },
      })

      if (updated.count !== 1) {
        const product = productMap.get(item.productId)
        const name = product?.name || item.productId
        const available = product?.stockQuantity
        throw new ApiError(
          `Insufficient stock for ${name}. Available: ${available ?? 'unknown'}, Requested: ${item.quantity}`,
          400
        )
      }
    }
  }

  let customerId: string | null = null
  if (normalizedSource === 'ONLINE' && customerEmail) {
    const existingCustomer = await tx.customer.findUnique({
      where: { email: customerEmail },
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
            }),
          },
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
          }),
        },
      })
      customerId = newCustomer.id
    }
  }

  const order = await tx.order.create({
    data: {
      idempotencyKey: idempotencyKey ?? undefined,
      source: normalizedSource,
      status: normalizedSource === 'POS' ? 'PROCESSED' : 'PENDING',
      total: calculatedTotal,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      paymentStatus,
      paymentMethod,
      stripeCheckoutSessionId,
      items: { create: orderItemsData },
    },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  })

  if (normalizedSource === 'POS') {
    await tx.sale.create({
      data: {
        orderId: order.id,
        source: 'POS',
        total: order.total,
      },
    })
  }

  return order
}
