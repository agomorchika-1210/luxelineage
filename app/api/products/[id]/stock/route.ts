import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// POST /api/products/[id]/stock - Increase or decrease stock (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const action = body?.action
    const rawQuantity = body?.quantity
    const quantity =
      typeof rawQuantity === 'number'
        ? rawQuantity
        : typeof rawQuantity === 'string'
          ? parseInt(rawQuantity, 10)
          : NaN

    if (!action || (action !== 'increase' && action !== 'decrease')) {
      return NextResponse.json(
        { error: 'Action must be "increase" or "decrease" and quantity is required' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const newQuantity = action === 'increase' 
      ? product.stockQuantity + quantity
      : product.stockQuantity - quantity

    // Prevent stock from going below zero
    if (newQuantity < 0) {
      return NextResponse.json(
        { error: 'Stock cannot go below zero' },
        { status: 400 }
      )
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { stockQuantity: newQuantity }
    })

    // Check for low stock and create notification if needed
    const { checkLowStock } = await import('@/lib/notifications')
    await checkLowStock(id).catch(err => {
      console.error('Error checking low stock:', err)
      // Don't fail the request if notification check fails
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    console.error('Update stock error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

