import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { prisma } from '@/lib/prisma'

// POST /api/auth/signup
// Creates a new admin user in Supabase Auth and database
export async function POST(request: NextRequest) {
  try {
    const { email, password, role } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Validate role if provided
    const validRoles = ['ADMIN', 'MANAGER', 'SALES_PERSON']
    const userRole = role && validRoles.includes(role) ? role : 'SALES_PERSON'

    // Check if admin already exists in database
    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    })

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email (for admin signup)
    })

    if (authError) {
      console.error('Supabase Auth signup error:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create user account' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    const supabaseUid = authData.user.id

    // Create admin record in database
    try {
      const admin = await prisma.admin.create({
        data: {
          firebaseUid: supabaseUid, // Field name is firebaseUid but stores Supabase UID
          email,
          role: userRole
        }
      })

      return NextResponse.json({
        success: true,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          supabaseUid: admin.firebaseUid
        },
        message: 'Admin account created successfully'
      }, { status: 201 })
    } catch (dbError: any) {
      // If database creation fails, try to delete the Supabase Auth user
      console.error('Database creation error:', dbError)
      try {
        await supabaseAdmin.auth.admin.deleteUser(supabaseUid)
      } catch (deleteError) {
        console.error('Failed to cleanup Supabase Auth user:', deleteError)
      }

      if (dbError.code === 'P2002') {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create admin record. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

