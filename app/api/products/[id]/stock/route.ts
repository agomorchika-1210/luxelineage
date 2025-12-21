import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// POST /api/products/[id]/stock - Increase or decrease stock (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { action, quantity } = await request.json()

    if (!action || !quantity || (action !== 'increase' && action !== 'decrease')) {
      return NextResponse.json(
        { error: 'Action must be "increase" or "decrease" and quantity is required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id }
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
      where: { id: params.id },
      data: { stockQuantity: newQuantity }
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

