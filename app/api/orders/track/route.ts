import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/orders/track?orderId=&email=
// Guest lookup: email must match the order (case-insensitive).
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId')?.trim()
  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase()

  if (!orderId || !email) {
    return NextResponse.json(
      { error: 'orderId and email query parameters are required' },
      { status: 400 }
    )
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      customerEmail: { equals: email, mode: 'insensitive' },
      source: 'ONLINE',
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      total: true,
      createdAt: true,
      customerName: true,
      shippingAddress: true,
      items: {
        select: {
          quantity: true,
          price: true,
          product: { select: { name: true, image: true } },
        },
      },
    },
  })

  if (!order) {
    return NextResponse.json(
      { error: 'No order found for this email and order ID' },
      { status: 404 }
    )
  }

  return NextResponse.json(order)
}
