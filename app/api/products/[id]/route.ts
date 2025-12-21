import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET /api/products/[id] - Get product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id }
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

    const data = await request.json()
    const { name, sku, brand, price, stockQuantity, category, description, image, images, sizes, colors, features } = data

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(sku && { sku }),
        ...(brand !== undefined && { brand }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(stockQuantity !== undefined && { stockQuantity: parseInt(stockQuantity) }),
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

