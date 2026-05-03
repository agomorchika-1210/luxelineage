import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { Prisma } from '@prisma/client'

// GET /api/products - List all products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    const q = (searchParams.get('q') || '').trim()
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')

    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : null
    const pageSizeRaw = pageSizeParam ? parseInt(pageSizeParam, 10) : null
    const pageSize = pageSizeRaw ? Math.min(100, Math.max(1, pageSizeRaw)) : null

    const ids = idsParam
      ? idsParam.split(',').map(s => s.trim()).filter(Boolean)
      : null

    const where: Prisma.ProductWhereInput | undefined =
      ids && ids.length > 0
        ? { id: { in: ids } }
        : q
          ? {
              OR: [
                { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { sku: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { brand: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { category: { contains: q, mode: Prisma.QueryMode.insensitive } },
              ],
            }
          : undefined

    // Backwards-compatible behavior:
    // - If no q/page/pageSize is provided, return the full array as before.
    // - If q or pagination is provided, return a paged response.
    const shouldPage = Boolean(q) || (page !== null && pageSize !== null)

    if (!shouldPage) {
      const products = await prisma.product.findMany({
        where,
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
    }

    const effectivePage = page ?? 1
    const effectivePageSize = pageSize ?? 25

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (effectivePage - 1) * effectivePageSize,
        take: effectivePageSize,
      }),
    ])

    const items = products.map(product => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      sizes: product.sizes ? JSON.parse(product.sizes) : [],
      colors: product.colors ? JSON.parse(product.colors) : [],
      features: product.features ? JSON.parse(product.features) : []
    }))

    return NextResponse.json({
      items,
      total,
      page: effectivePage,
      pageSize: effectivePageSize,
      q,
    })
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
    console.log('Received product data:', data)
    const { name, sku, brand, cost, price, stockQuantity, lowStockThreshold, category, description, image, images, sizes, colors, features } = data

    if (!name || !sku || !price || stockQuantity === undefined) {
      return NextResponse.json(
        { error: 'Name, SKU, price, and stockQuantity are required' },
        { status: 400 }
      )
    }

    // Parse and validate numeric fields
    const parsedCost = cost !== undefined && cost !== null && cost !== '' ? parseFloat(cost.toString()) : 0
    const parsedPrice = parseFloat(price)
    const parsedStock = parseInt(stockQuantity.toString())
    const parsedLowStockThreshold =
      lowStockThreshold !== undefined && lowStockThreshold !== null && lowStockThreshold !== ''
        ? parseInt(lowStockThreshold.toString())
        : 10

    if (isNaN(parsedPrice)) {
      return NextResponse.json(
        { error: 'Invalid price value' },
        { status: 400 }
      )
    }

    if (isNaN(parsedStock)) {
      return NextResponse.json(
        { error: 'Invalid stock quantity value' },
        { status: 400 }
      )
    }

    if (isNaN(parsedLowStockThreshold) || parsedLowStockThreshold < 0) {
      return NextResponse.json(
        { error: 'Invalid low stock threshold value' },
        { status: 400 }
      )
    }

    console.log('Parsed values:', { parsedCost, parsedPrice, parsedStock })

    try {
      const product = await prisma.product.create({
        data: {
          name,
          sku,
          brand: brand || '',
          cost: parsedCost,
          price: parsedPrice,
          stockQuantity: parsedStock,
          lowStockThreshold: parsedLowStockThreshold,
          category: category || '',
          description: description || null,
          image: image || null,
          images: images && Array.isArray(images) && images.length > 0 ? JSON.stringify(images) : null,
          sizes: sizes && Array.isArray(sizes) && sizes.length > 0 ? JSON.stringify(sizes) : null,
          colors: colors && Array.isArray(colors) && colors.length > 0 ? JSON.stringify(colors) : null,
          features: features && Array.isArray(features) && features.length > 0 ? JSON.stringify(features) : null
        }
      })
      
      console.log('Product created successfully:', product.id)

      return NextResponse.json({
        ...product,
        images: product.images ? JSON.parse(product.images) : [],
        sizes: product.sizes ? JSON.parse(product.sizes) : [],
        colors: product.colors ? JSON.parse(product.colors) : [],
        features: product.features ? JSON.parse(product.features) : []
      }, { status: 201 })
    } catch (dbError: any) {
      // Re-throw to be caught by outer catch block
      throw dbError
    }

  } catch (error: any) {
    console.error('Create product error:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      meta: error.meta,
      stack: error.stack
    })
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 400 }
      )
    }
    
    // Check if it's a database schema error (missing column)
    if (error.message?.includes('Unknown column') || 
        (error.message?.includes('column') && error.message?.includes('does not exist')) ||
        error.code === 'P2021' || 
        error.code === 'P2011' ||
        error.message?.includes('cost')) {
      return NextResponse.json(
        { 
          error: 'Database schema error: The "cost" field is missing. Please run the SQL migration in Supabase Dashboard > SQL Editor. See add-cost-fields.sql file.',
          details: error.message
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error', details: error.code },
      { status: 500 }
    )
  }
}

