import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET /api/products/[id] - Get product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      sizes: product.sizes ? JSON.parse(product.sizes) : [],
      colors: product.colors ? JSON.parse(product.colors) : [],
      features: product.features ? JSON.parse(product.features) : []
    })
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id] - Update product (admin only)
export async function PUT(
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

    const data = await request.json()
    const { name, sku, brand, cost, price, stockQuantity, lowStockThreshold, category, description, image, images, sizes, colors, features } = data

    const parsedCost =
      cost !== undefined && cost !== null && cost !== '' ? parseFloat(cost.toString()) : undefined
    const parsedPrice =
      price !== undefined && price !== null && price !== '' ? parseFloat(price.toString()) : undefined
    const parsedStock =
      stockQuantity !== undefined && stockQuantity !== null && stockQuantity !== ''
        ? parseInt(stockQuantity.toString(), 10)
        : undefined
    const parsedLowStockThreshold =
      lowStockThreshold !== undefined && lowStockThreshold !== null && lowStockThreshold !== ''
        ? parseInt(lowStockThreshold.toString(), 10)
        : undefined

    if (parsedCost !== undefined && !Number.isFinite(parsedCost)) {
      return NextResponse.json({ error: 'Invalid cost value' }, { status: 400 })
    }
    if (parsedPrice !== undefined && !Number.isFinite(parsedPrice)) {
      return NextResponse.json({ error: 'Invalid price value' }, { status: 400 })
    }
    if (parsedStock !== undefined && (!Number.isFinite(parsedStock) || parsedStock < 0)) {
      return NextResponse.json({ error: 'Invalid stock quantity value' }, { status: 400 })
    }
    if (
      parsedLowStockThreshold !== undefined &&
      (!Number.isFinite(parsedLowStockThreshold) || parsedLowStockThreshold < 0)
    ) {
      return NextResponse.json({ error: 'Invalid low stock threshold value' }, { status: 400 })
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(sku && { sku }),
        ...(brand !== undefined && { brand }),
        ...(parsedCost !== undefined && { cost: parsedCost }),
        ...(parsedPrice !== undefined && { price: parsedPrice }),
        ...(parsedStock !== undefined && { stockQuantity: parsedStock }),
        ...(parsedLowStockThreshold !== undefined && { lowStockThreshold: parsedLowStockThreshold }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(images !== undefined && { images: images ? JSON.stringify(images) : null }),
        ...(sizes !== undefined && { sizes: sizes ? JSON.stringify(sizes) : null }),
        ...(colors !== undefined && { colors: colors ? JSON.stringify(colors) : null }),
        ...(features !== undefined && { features: features ? JSON.stringify(features) : null })
      }
    })

    return NextResponse.json({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      sizes: product.sizes ? JSON.parse(product.sizes) : [],
      colors: product.colors ? JSON.parse(product.colors) : [],
      features: product.features ? JSON.parse(product.features) : []
    })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    console.error('Update product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Delete product (admin only)
export async function DELETE(
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

    // Check if product exists and has no order items
    const product = await prisma.product.findUnique({
      where: { id },
      include: { orderItems: { take: 1 } }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Prevent deletion if product has orders
    if (product.orderItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with existing orders. Consider setting stock to 0 instead.' },
        { status: 400 }
      )
    }

    await prisma.product.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Product deleted successfully' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    console.error('Delete product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

