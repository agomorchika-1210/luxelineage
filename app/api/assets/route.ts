import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET /api/assets - Get all assets (admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const assets = await prisma.asset.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ assets })
  } catch (error) {
    console.error('Get assets error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/assets - Create asset (admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, name, description, value, date } = body

    if (!type || !name || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: type, name, value' },
        { status: 400 }
      )
    }

    const asset = await prisma.asset.create({
      data: {
        type,
        name,
        description,
        value: parseFloat(value),
        date: date ? new Date(date) : new Date(),
      }
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error('Create asset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

