import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { prisma } from '@/lib/prisma'

// POST /api/auth/login
// Note: This endpoint creates/verifies admin in database after Supabase Auth
// The actual login happens on the client side with Supabase Auth
// This endpoint is called after successful Supabase login to sync admin data
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Supabase access token is required' },
        { status: 400 }
      )
    }

    // Verify Supabase token
    let supabaseUser
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken)
      
      if (error || !user) {
        return NextResponse.json(
          { error: `Token verification failed: ${error?.message || 'Invalid token'}` },
          { status: 401 }
        )
      }
      
      supabaseUser = user
    } catch (verifyError: any) {
      console.error('Token verification error:', verifyError)
      return NextResponse.json(
        { error: `Token verification failed: ${verifyError.message || 'Unknown error'}` },
        { status: 401 }
      )
    }

    const supabaseUid = supabaseUser.id
    const email = supabaseUser.email

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found in user data' },
        { status: 400 }
      )
    }

    // Check if admin exists in database, create if not
    let admin = await prisma.admin.findUnique({
      where: { firebaseUid: supabaseUid } // Note: field name is still firebaseUid in schema, but now stores Supabase UID
    })

    if (!admin) {
      // Create admin in database linked to Supabase UID
      admin = await prisma.admin.create({
        data: {
          firebaseUid: supabaseUid, // Using existing field name, but storing Supabase UID
          email
        }
      })
    }

    return NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        supabaseUid: admin.firebaseUid // Return as supabaseUid for clarity
      },
      // Return the same token for client to use
      token: accessToken
    })
  } catch (error: any) {
    console.error('Login error:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    })
    
    if (error.message?.includes('Invalid') || error.message?.includes('expired')) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    if (error.message?.includes('prisma') || error.message?.includes('database')) {
      return NextResponse.json(
        { error: 'Database error. Please check your connection.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
