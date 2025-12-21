import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/middleware'

// GET /api/admin/users - List all users (admin and manager only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission (admin or manager)
    const hasPermission = await requireRole(request, ['ADMIN', 'MANAGER'])
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const users = await prisma.admin.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose firebaseUid to frontend
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can create users
    const hasPermission = await requireRole(request, ['ADMIN'])
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can create users' },
        { status: 403 }
      )
    }

    const data = await request.json()
    const { email, role, firebaseUid } = data

    if (!email || !role || !firebaseUid) {
      return NextResponse.json(
        { error: 'Email, role, and firebaseUid are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['ADMIN', 'MANAGER', 'SALES_PERSON'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN, MANAGER, or SALES_PERSON' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.admin.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    const user = await prisma.admin.create({
      data: {
        email,
        role,
        firebaseUid
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    console.error('Create user error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

