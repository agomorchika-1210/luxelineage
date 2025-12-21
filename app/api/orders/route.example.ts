// Example: Refactored route using withAuth middleware
// This shows how routes can be simplified

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

// GET /api/orders - List all orders (admin only)
export const GET = withAuth(async (request: NextRequest, auth) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const where: any = {}
  if (status) {
    where.status = status.toUpperCase()
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: {
          product: true
        }
      },
      sale: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(orders)
})

// POST /api/orders - Create order (public for checkout)
// This one doesn't use withAuth since checkout is public
export async function POST(request: NextRequest) {
  // ... existing code
}

