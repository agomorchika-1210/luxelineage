import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET /api/products - List all products
export async function GET(request: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // Parse JSON fields
    const formattedProducts = products.map(product => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      sizes: product.sizes ? JSON.parse(product.sizes) : [],
      colors: product.colors ? JSON.parse(product.colors) : [],
      features: product.features ? JSON.parse(product.features) : []
    }))

    return NextResponse.json(formattedProducts)
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create product (admin only)
export async function POST(request: NextRequest) {
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

    if (!name || !sku || !price || stockQuantity === undefined) {
      return NextResponse.json(
        { error: 'Name, SKU, price, and stockQuantity are required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        brand: brand || '',
        price: parseFloat(price),
        stockQuantity: parseInt(stockQuantity),
        category: category || '',
        description,
        image,
        images: images ? JSON.stringify(images) : null,
        sizes: sizes ? JSON.stringify(sizes) : null,
        colors: colors ? JSON.stringify(colors) : null,
        features: features ? JSON.stringify(features) : null
      }
    })

    return NextResponse.json({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      sizes: product.sizes ? JSON.parse(product.sizes) : [],
      colors: product.colors ? JSON.parse(product.colors) : [],
      features: product.features ? JSON.parse(product.features) : []
    }, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 400 }
      )
    }
    console.error('Create product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

