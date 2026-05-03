import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET /api/liabilities - Get all liabilities (admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const liabilities = await prisma.liability.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ liabilities })
  } catch (error) {
    console.error('Get liabilities error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/liabilities - Create liability (admin only)
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
    const { type, name, description, amount, date } = body

    if (!type || !name || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: type, name, amount' },
        { status: 400 }
      )
    }

    const liability = await prisma.liability.create({
      data: {
        type,
        name,
        description,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
      }
    })

    return NextResponse.json(liability, { status: 201 })
  } catch (error) {
    console.error('Create liability error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

