import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/verify-token'

// POST /api/auth/login
// Called client-side after a successful Supabase sign-in to sync the
// Supabase user with the Prisma Admin record.
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Supabase access token is required' },
        { status: 400 }
      )
    }

    // Verify token via 3-tier cascade (service key → public key → JWT decode)
    const verified = await verifyToken(accessToken)

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { id: supabaseUid, email } = verified

    let admin = await prisma.admin.findUnique({
      where: { firebaseUid: supabaseUid }
    })

    // Safe relink path: if admin exists by email but UID differs (common after
    // auth migrations or key changes), bind that admin row to the current UID.
    if (!admin) {
      const adminByEmail = await prisma.admin.findUnique({
        where: { email }
      })

      if (adminByEmail) {
        console.log('[login] Relinking admin by email:', email, '→ UID:', supabaseUid)
        admin = await prisma.admin.update({
          where: { id: adminByEmail.id },
          data: { firebaseUid: supabaseUid }
        })
      }
    }

    // Zero-admin bootstrap: when the Admin table is completely empty, the first
    // verified Supabase user is automatically promoted to ADMIN. This path is
    // permanently blocked once any admin record exists.
    if (!admin) {
      const adminCount = await prisma.admin.count()
      if (adminCount === 0) {
        console.log('[login] Zero-admin bootstrap: creating first admin for', email)
        admin = await prisma.admin.create({
          data: {
            email,
            firebaseUid: supabaseUid,
            role: 'ADMIN',
          }
        })
      }
    }

    if (!admin) {
      console.warn('[login] No admin record for uid:', supabaseUid, 'email:', email)
      return NextResponse.json(
        { error: 'Forbidden: not an admin user' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        supabaseUid: admin.firebaseUid,
      },
      token: accessToken,
    })
  } catch (error: any) {
    // Log the full error so it's visible in the Next.js dev server terminal
    console.error('[login] Unexpected error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    })

    // Prisma-specific error codes
    if (error.code === 'P1001') {
      return NextResponse.json(
        { error: 'Database unreachable. Check DATABASE_URL and network.' },
        { status: 500 }
      )
    }
    if (error.code === 'P2021') {
      return NextResponse.json(
        { error: 'Database table missing. Run: npx prisma db push' },
        { status: 500 }
      )
    }
    if (error.code === 'P1003') {
      return NextResponse.json(
        { error: 'Database does not exist. Run: npx prisma db push' },
        { status: 500 }
      )
    }

    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: isDev
          ? `Server error: ${error.message} (code: ${error.code ?? 'n/a'})`
          : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
